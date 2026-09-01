"""Export horizontal-only first-evolution Pokémon sprite sheets (T-10).

Parses each first-evolution .aseprite file under public/assets/sprites/,
composites its frames (28x28 RGBA, 100 ms), selects and repacks only the
left/right idle and walking frames, and writes one compact horizontal-strip
PNG per species plus a generated TypeScript metadata module
(src/features/pokeden/sprite-sheets.ts) that the Pomodoro companion canvas
consumes.

Byte-level facts are verified against the sources (see scripts/extract-pokemon-profiles.py
for the original parser this one extends):
- Header at 0: <IHHHHH> size, magic 0xA5E0, frames, width, height, depth(32).
- Frame header at 128: <IHHH2sI> frame_size, magic 0xF1FA, old_chunks, duration, _, new_chunks.
- Chunk: <IH> size (INCLUDES the 6-byte header), type; next chunk at offset + size.
- Layer chunk 0x2004; cel chunk 0x2005 (type 2 = zlib RGBA, w/h at data offset 16, data at 20);
  Tags chunk 0x2018.
"""

from __future__ import annotations

import pathlib
import struct
import zlib

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
SPRITES_ROOT = ROOT / "public" / "assets" / "sprites"
OUTPUT_MODULE = ROOT / "src" / "features" / "pokeden" / "sprite-sheets.ts"

FRAME_WIDTH = 28
FRAME_HEIGHT = 28
FRAME_RGBA_BYTES = FRAME_WIDTH * FRAME_HEIGHT * 4

# folder -> (species id, display name, source stem)
SPECIES = [
    ("blastoise", "squirtle", "Squirtle", "squirtle"),
    ("bulbasaur", "bulbasaur", "Bulbasaur", "ivysaur"),
    ("charizard", "charmander", "Charmander", "charmander"),
    ("gengar", "gastly", "Gastly", "gastly"),
    ("prinplup", "piplup", "Piplup", "piplup"),
    ("snorlax", "munchlax", "Munchlax", "munchlax"),
    ("wigglypuff", "jigglypuff", "Jigglypuff", "jigglypuff"),
]

# Normalize the typos present in the source tags.
TAG_NAME_FIXES = {
    "idle-leftt": "idle-left",
    "walk-dow": "walk-down",
}

# For files with combined horizontal tags, expand them into the four exported
# states. Left facings flip the shared right-facing frames.
EXPANDED_STATES: dict[str, dict[str, bool | None]] = {
    "idle-left-right": {"idle-left": True, "idle-right": None},
    "walk-left-right": {"walking-left": True, "walking-right": None},
}

STATE_TAGS_8 = {
    "idle-left": "idle-left",
    "idle-right": "idle-right",
    "walking-left": "walk-left",
    "walking-right": "walk-right",
}
STATE_ORDER = ("idle-left", "idle-right", "walking-left", "walking-right")

# These tag ranges must cover exactly 0..frameCount-1 in the source files.
EXPECTED_6TAG_RANGES = [(0, 0), (1, 1), (2, 2), (3, 6), (7, 10), (11, 14)]
EXPECTED_7TAG_RANGES = [(0, 0), (1, 1), (2, 2), (3, 3), (4, 7), (8, 11), (12, 15)]
EXPECTED_8TAG_RANGES = [(0, 0), (1, 1), (2, 2), (3, 3), (4, 7), (8, 11), (12, 15), (16, 19)]


def require(condition: bool, message: str) -> None:
    """Raise a clear error rather than produce a plausible but wrong output."""
    if not condition:
        raise ValueError(message)


def parse_file(path: pathlib.Path) -> tuple[int, int, list[bytes], list[tuple[str, int, int]]]:
    """Return (width, height, frames, tags) for one .aseprite file."""
    data = path.read_bytes()
    declared_size, magic, frame_count, width, height, depth = struct.unpack_from("<IHHHHH", data, 0)
    require(magic == 0xA5E0, f"{path.name}: bad magic 0x{magic:04X}")
    require(declared_size == len(data), f"{path.name}: header size {declared_size} != actual {len(data)}")
    require(depth == 32, f"{path.name}: depth {depth}, expected 32")
    require((width, height) == (FRAME_WIDTH, FRAME_HEIGHT), f"{path.name}: canvas {width}x{height}")

    frames: list[bytes] = []
    tags: list[tuple[str, int, int]] = []
    offset = 128
    for _ in range(frame_count):
        frame_size, frame_magic, _old_chunks, duration, _reserved, new_chunks = struct.unpack_from(
            "<IHHH2sI", data, offset
        )
        require(frame_magic == 0xF1FA, f"{path.name}: bad frame magic")
        require(duration == 100, f"{path.name}: frame duration {duration}, expected 100")
        frame_end = offset + frame_size
        require(frame_end <= len(data), f"{path.name}: frame exceeds file")

        chunk_count = new_chunks if new_chunks != 0 else _old_chunks
        frame_img = bytearray(FRAME_RGBA_BYTES)
        chunk_offset = offset + 16
        for _chunk_index in range(chunk_count):
            require(chunk_offset + 6 <= frame_end, f"{path.name}: chunk header exceeds frame")
            chunk_size, chunk_type = struct.unpack_from("<IH", data, chunk_offset)
            require(chunk_size >= 6, f"{path.name}: chunk size {chunk_size} < 6")
            chunk_end = chunk_offset + chunk_size
            require(chunk_end <= frame_end, f"{path.name}: chunk extends beyond frame")
            chunk_data = data[chunk_offset + 6 : chunk_end]

            if chunk_type == 0x2005:
                layer_index, x, y, _opacity, cel_type = struct.unpack_from("<HhhBH", chunk_data, 0)
                require(cel_type == 2, f"{path.name}: cel type {cel_type}, expected 2")
                cel_w, cel_h = struct.unpack_from("<HH", chunk_data, 16)
                raw = zlib.decompress(chunk_data[20:])
                require(len(raw) == cel_w * cel_h * 4, f"{path.name}: cel decoded size mismatch")
                require(layer_index == 0, f"{path.name}: unexpected layer {layer_index}")
                for cy in range(cel_h):
                    for cx in range(cel_w):
                        src = (cy * cel_w + cx) * 4
                        dx, dy = x + cx, y + cy
                        if 0 <= dx < FRAME_WIDTH and 0 <= dy < FRAME_HEIGHT:
                            dst = (dy * FRAME_WIDTH + dx) * 4
                            frame_img[dst : dst + 4] = raw[src : src + 4]

            elif chunk_type == 0x2018:
                tag_count = struct.unpack_from("<H", chunk_data, 0)[0]
                tp = 10  # after numTags(2) + flags(8)
                for _tag_index in range(tag_count):
                    tag_from, tag_to = struct.unpack_from("<HH", chunk_data, tp)
                    # Byte-verified layout: fixed fields (17 bytes), then a
                    # 1-byte name length at +17, a 1-byte padding at +18, and
                    # the name starting at +19. Entry stride = 19 + nameLen.
                    name_len = chunk_data[tp + 17]
                    name = chunk_data[tp + 19 : tp + 19 + name_len].decode("utf-8")
                    tags.append((name, tag_from, tag_to))
                    tp += 19 + name_len
                require(tp == len(chunk_data), f"{path.name}: tag chunk length mismatch")

            chunk_offset = chunk_end
        require(chunk_offset == frame_end, f"{path.name}: chunks end at {chunk_offset}, frame at {frame_end}")

        # Validate the frame is not empty (has opaque pixels).
        require(
            any(frame_img[i + 3] > 0 for i in range(0, FRAME_RGBA_BYTES, 4)),
            f"{path.name}: frame {len(frames)} is empty",
        )
        frames.append(bytes(frame_img))
        offset = frame_end

    require(offset == len(data), f"{path.name}: frames end at {offset}, file at {len(data)}")
    return width, height, frames, tags


def normalize_tags(raw_tags: list[tuple[str, int, int]]) -> list[tuple[str, int, int]]:
    """Apply the walk-dow -> walk-down fix and sort by start frame."""
    tags = [(TAG_NAME_FIXES.get(name, name), frm, to) for name, frm, to in raw_tags]
    tags.sort(key=lambda item: item[1])
    return tags


def build_horizontal_export(
    tags: list[tuple[str, int, int]], frames: list[bytes]
) -> tuple[list[bytes], dict[str, tuple[int, int, bool | None]]]:
    """Select horizontal frames and remap four states into a compact strip."""
    names = [name for name, _frm, _to in tags]
    require(len(set(names)) == len(names), f"duplicate tag names: {names}")
    by_name = {name: (frm, to) for name, frm, to in tags}

    if len(tags) == 8:
        expected_names = {
            "idle-down",
            "idle-up",
            "idle-left",
            "idle-right",
            "walk-down",
            "walk-up",
            "walk-left",
            "walk-right",
        }
        require(set(names) == expected_names, f"8-tag names mismatch: {names}")
        require(
            [(frm, to) for _name, frm, to in tags] == EXPECTED_8TAG_RANGES,
            f"8-tag ranges mismatch: {tags}",
        )
        require(len(frames) == 20, f"8-tag file has {len(frames)} frames, expected 20")
        horizontal_tag_names = list(STATE_TAGS_8.values())
    elif len(tags) == 7:
        expected_names = {
            "idle-down",
            "idle-up",
            "idle-left",
            "idle-right",
            "walk-down",
            "walk-left",
            "walk-right",
        }
        require(set(names) == expected_names, f"7-tag names mismatch: {names}")
        require(
            [(frm, to) for _name, frm, to in tags] == EXPECTED_7TAG_RANGES,
            f"7-tag ranges mismatch: {tags}",
        )
        require(len(frames) == 16, f"7-tag file has {len(frames)} frames, expected 16")
        horizontal_tag_names = list(STATE_TAGS_8.values())
    else:
        require(len(tags) == 6, f"unexpected tag count {len(tags)}: {names}")
        expected_names = {
            "idle-down",
            "idle-up",
            "idle-left-right",
            "walk-down",
            "walk-up",
            "walk-left-right",
        }
        require(set(names) == expected_names, f"6-tag names mismatch: {names}")
        require(
            [(frm, to) for _name, frm, to in tags] == EXPECTED_6TAG_RANGES,
            f"6-tag ranges mismatch: {tags}",
        )
        require(len(frames) == 15, f"6-tag file has {len(frames)} frames, expected 15")
        horizontal_tag_names = list(EXPANDED_STATES)

    require(
        all(tag_name in by_name for tag_name in horizontal_tag_names),
        f"horizontal tags missing: expected {horizontal_tag_names}, got {names}",
    )
    selected_occurrences = [
        source_index
        for tag_name in horizontal_tag_names
        for source_index in range(by_name[tag_name][0], by_name[tag_name][1] + 1)
    ]
    selected_indices = sorted(set(selected_occurrences))
    require(len(selected_indices) == len(selected_occurrences), "horizontal tag ranges overlap")
    require(selected_indices, "no horizontal frames selected")
    require(selected_indices[-1] < len(frames), "horizontal tag range exceeds source frames")

    compact_frames = [frames[source_index] for source_index in selected_indices]
    require(len(compact_frames) == len(selected_indices), "not every selected frame was repacked")
    require(
        all(compact_frames[index] == frames[source_index] for index, source_index in enumerate(selected_indices)),
        "repacked frame order mismatch",
    )
    source_to_compact = {source_index: compact_index for compact_index, source_index in enumerate(selected_indices)}

    def compact_range(tag_name: str) -> tuple[int, int]:
        frm, to = by_name[tag_name]
        compact_indices = [source_to_compact[index] for index in range(frm, to + 1)]
        require(
            compact_indices == list(range(compact_indices[0], compact_indices[-1] + 1)),
            f"repacked range for {tag_name} is not contiguous",
        )
        return compact_indices[0], compact_indices[-1]

    states: dict[str, tuple[int, int, bool | None]] = {}
    for state_name in STATE_ORDER:
        if len(tags) == 6:
            tag_name = "idle-left-right" if state_name.startswith("idle-") else "walk-left-right"
            flip = EXPANDED_STATES[tag_name][state_name]
        else:
            tag_name = STATE_TAGS_8[state_name]
            flip = None
        frm, to = compact_range(tag_name)
        states[state_name] = (frm, to, flip)

    require(tuple(states) == STATE_ORDER, f"horizontal state order mismatch: {list(states)}")
    return compact_frames, states


def write_sheet(path: pathlib.Path, frames: list[bytes]) -> None:
    """Write one compact horizontal strip PNG (frames in source order)."""
    sheet = Image.new("RGBA", (FRAME_WIDTH * len(frames), FRAME_HEIGHT))
    for index, frame in enumerate(frames):
        tile = Image.frombytes("RGBA", (FRAME_WIDTH, FRAME_HEIGHT), frame)
        sheet.paste(tile, (index * FRAME_WIDTH, 0))
    sheet.save(path, format="PNG")


def ts_literal(value: object) -> str:
    """Render a Python value as a TypeScript literal (strings, ints, lists, dicts)."""
    if isinstance(value, str):
        return f'"{value}"'
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    if value is None:
        return "undefined"
    if isinstance(value, list):
        return f"[{', '.join(ts_literal(item) for item in value)}]"
    if isinstance(value, tuple):
        return f"[{', '.join(ts_literal(item) for item in value)}]"
    if isinstance(value, dict):
        inner = ", ".join(
            f"{k if isinstance(k, str) and k.isidentifier() else ts_literal(k)}: {ts_literal(v)}"
            for k, v in value.items()
        )
        return f"{{ {inner} }}"
    raise TypeError(f"unsupported literal type: {type(value)!r}")


def generate_module(entries: list[dict]) -> str:
    """Generate the sprite-sheets.ts module content."""
    lines: list[str] = []
    lines.append("// Generated by scripts/export-sprite-sheets.py — do not edit by hand.")
    lines.append("import type { CompanionId } from \"@/features/pokeden/companions\";")
    lines.append("")
    species_ids = [entry["species"] for entry in entries]
    lines.append("export type SpriteSpecies = " + " | ".join(f'\"{sid}\"' for sid in species_ids) + ";")
    lines.append("")
    lines.append(
        'export type SpriteStateName = "idle-left" | "idle-right" | "walking-left" | "walking-right";'
    )
    lines.append("")
    lines.append("export type SpriteFrameRange = { from: number; to: number; flip?: boolean };")
    lines.append("")
    lines.append("export type SpriteSheetEntry = {")
    lines.append("  species: SpriteSpecies;")
    lines.append("  displayName: string;")
    lines.append("  gender: \"♂\" | \"♀\";")
    lines.append("  sheetUrl: string;")
    lines.append("  frameWidth: number;")
    lines.append("  frameHeight: number;")
    lines.append("  frameCount: number;")
    lines.append("  states: Record<SpriteStateName, SpriteFrameRange>;")
    lines.append("};")
    lines.append("")
    lines.append("export const SPRITE_SHEETS: Record<SpriteSpecies, SpriteSheetEntry> = {")
    for entry in entries:
        states_lines = []
        for state_name, (frm, to, flip) in entry["states"].items():
            fields = {"from": frm, "to": to}
            if flip is not None:
                fields["flip"] = flip
            states_lines.append(f"      {ts_literal(state_name)}: {ts_literal(fields)},")
        lines.append(f"  {entry['species']}: {{")
        lines.append(f"    species: {ts_literal(entry['species'])},")
        lines.append(f"    displayName: {ts_literal(entry['displayName'])},")
        lines.append(f"    gender: {ts_literal(entry['gender'])},")
        lines.append(f"    sheetUrl: {ts_literal(entry['sheetUrl'])},")
        lines.append(f"    frameWidth: {entry['frameWidth']},")
        lines.append(f"    frameHeight: {entry['frameHeight']},")
        lines.append(f"    frameCount: {entry['frameCount']},")
        lines.append("    states: {")
        lines.extend(states_lines)
        lines.append("    },")
        lines.append("  },")
    lines.append("};")
    lines.append("")
    lines.append("export const FIRST_EVOLUTION_BY_COMPANION: Record<CompanionId, SpriteSpecies> = {")
    for companion_id, species_id in [
        ("blastoise", "squirtle"),
        ("bulbasaur", "bulbasaur"),
        ("charizard", "charmander"),
        ("gengar", "gastly"),
        ("prinplup", "piplup"),
        ("snorlax", "munchlax"),
        ("wigglypuff", "jigglypuff"),
    ]:
        lines.append(f"  {companion_id}: {ts_literal(species_id)},")
    lines.append("};")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    entries: list[dict] = []
    for folder, species_id, display_name, source_stem in SPECIES:
        source = SPRITES_ROOT / folder / f"{source_stem}.aseprite"
        require(source.exists(), f"missing source: {source}")
        width, height, frames, raw_tags = parse_file(source)
        tags = normalize_tags(raw_tags)
        compact_frames, states = build_horizontal_export(tags, frames)
        sheet_name = f"{species_id}-sheet.png"
        sheet_path = source.parent / sheet_name
        write_sheet(sheet_path, compact_frames)
        entries.append(
            {
                "species": species_id,
                "displayName": display_name,
                "gender": "♂",
                "sheetUrl": f"/assets/sprites/{folder}/{sheet_name}",
                "frameWidth": width,
                "frameHeight": height,
                "frameCount": len(compact_frames),
                "states": states,
            }
        )
        tag_summary = ", ".join(f"{name}:{frm}-{to}" for name, frm, to in tags)
        print(
            f"{species_id}: {len(frames)} source frames -> {len(compact_frames)} horizontal frames "
            f"-> {sheet_path.name} ({width * len(compact_frames)}x{height}) tags=[{tag_summary}]"
        )

    module = generate_module(entries)
    # Write as bytes so Windows text-mode newline translation (LF -> CRLF)
    # cannot leak into the generated module; Biome requires LF line endings.
    OUTPUT_MODULE.write_bytes(module.encode("utf-8"))
    print(f"wrote {OUTPUT_MODULE.relative_to(ROOT)}")
    print(f"wrote {len(entries)} sprite sheets under {SPRITES_ROOT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
