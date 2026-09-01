"""Extract the three T-07 Pokémon profile layers from their Aseprite source."""

import hashlib
import pathlib
import struct
import zlib

from PIL import Image


ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "assets" / "background" / "pokemon-profiles.aseprite"
OUTPUT_DIR = SOURCE.parent

EXPECTED_HASHES = {
    "bulbasaur-profile": "ae0a6c11f7c3db23d3f32ba2404f8890e2f1aa8162dd6663bafa2466bda36b2d",
    "charizard-profile": "d446b2ea4be98eeedd87e094b816b4a335988df2891ab83c484a305b5e7e9c5c",
    "blastoise-profile": "5d9b18987117129e388ebcc402f896b0f5076a4d042529817c365c844c40d350",
}
EXPECTED_INDICES = {
    "bulbasaur-profile": 0,
    "charizard-profile": 1,
    "blastoise-profile": 2,
}
CANVAS_SIZE = (32, 32)
RGBA_BYTE_COUNT = CANVAS_SIZE[0] * CANVAS_SIZE[1] * 4


def require(condition: bool, message: str) -> None:
    """Raise a clear error rather than producing a plausible but incorrect image."""
    if not condition:
        raise ValueError(message)


def parse_layer_name(chunk_data: bytes) -> str:
    """Read the UTF-8 name following an Aseprite layer chunk's fixed fields."""
    # The chunk's 6-byte size/type header precedes this data. Thus the name length
    # is at chunk offset 22 (data offset 16), and the name starts at 24 (data 18).
    require(len(chunk_data) >= 18, "Layer chunk is too short for its name")
    name_length = struct.unpack_from("<H", chunk_data, 16)[0]
    require(len(chunk_data) >= 18 + name_length, "Layer chunk contains a truncated name")
    try:
        return chunk_data[18 : 18 + name_length].decode("utf-8")
    except UnicodeDecodeError as error:
        raise ValueError("Layer chunk name is not valid UTF-8") from error


def parse_compressed_cel(chunk_data: bytes) -> tuple[int, tuple[int, int], int, int, tuple[int, int], bytes]:
    """Parse and inflate one type-2 (compressed raw RGBA) cel chunk."""
    require(len(chunk_data) >= 20, "Cel chunk is too short")
    layer_index, x, y, opacity, cel_type = struct.unpack_from("<HhhBH", chunk_data, 0)
    require(cel_type == 2, f"Layer {layer_index} cel type is {cel_type}, expected 2")

    # After layer/x/y/opacity/type come z-index (2 bytes) and 5 reserved bytes.
    # Aseprite stores type-2 width and height as 16-bit words at data offset 16.
    width, height = struct.unpack_from("<HH", chunk_data, 16)
    try:
        raw = zlib.decompress(chunk_data[20:])
    except zlib.error as error:
        raise ValueError(f"Layer {layer_index} cel has invalid zlib data: {error}") from error

    require(len(raw) == width * height * 4, (
        f"Layer {layer_index} decoded to {len(raw)} bytes; expected {width * height * 4}"
    ))
    return layer_index, (x, y), opacity, cel_type, (width, height), raw


def extract_layers(source: pathlib.Path) -> tuple[list[str], dict[int, tuple[tuple[int, int], int, int, tuple[int, int], bytes]]]:
    """Parse the single Aseprite frame and return layer names and cels by index."""
    data = source.read_bytes()
    require(len(data) >= 144, f"Source is too short to contain a header and frame: {source}")

    declared_size, magic, frame_count, width, height, depth = struct.unpack_from("<IHHHHH", data, 0)
    require(magic == 0xA5E0, f"Invalid Aseprite header magic 0x{magic:04X}; expected 0xA5E0")
    require(declared_size == len(data), (
        f"Header declares {declared_size} bytes, but source contains {len(data)}"
    ))
    require(depth == 32, f"Color depth is {depth}, expected 32-bit RGBA")
    require(frame_count == 1, f"Frame count is {frame_count}, expected exactly 1")
    require((width, height) == CANVAS_SIZE, f"Canvas is {width}x{height}, expected 32x32")

    frame_size, frame_magic, old_chunk_count, duration, _, new_chunk_count = struct.unpack_from(
        "<IHHH2sI", data, 128
    )
    require(frame_magic == 0xF1FA, (
        f"Invalid frame magic 0x{frame_magic:04X}; expected 0xF1FA"
    ))
    require(128 + frame_size <= len(data), "Frame extends beyond the source file")
    require(duration == 100, f"Frame duration is {duration} ms, expected 100 ms")
    chunk_count = old_chunk_count if old_chunk_count != 0 else new_chunk_count

    layers: list[str] = []
    cels: dict[int, tuple[tuple[int, int], int, int, tuple[int, int], bytes]] = {}
    offset = 144
    frame_end = 128 + frame_size

    for chunk_number in range(chunk_count):
        require(offset + 6 <= frame_end, f"Chunk {chunk_number} header exceeds the frame")
        chunk_size, chunk_type = struct.unpack_from("<IH", data, offset)
        require(chunk_size >= 6, f"Chunk {chunk_number} has invalid size {chunk_size}")
        chunk_end = offset + chunk_size
        require(chunk_end <= frame_end, f"Chunk {chunk_number} extends beyond the frame")
        chunk_data = data[offset + 6 : chunk_end]

        if chunk_type == 0x2004:
            layers.append(parse_layer_name(chunk_data))
        elif chunk_type == 0x2005:
            layer_index, position, opacity, cel_type, size, raw = parse_compressed_cel(chunk_data)
            require(layer_index not in cels, f"Layer {layer_index} has more than one cel in frame 0")
            cels[layer_index] = (position, opacity, cel_type, size, raw)

        offset = chunk_end

    require(offset == frame_end, f"Parsed chunks end at byte {offset}, frame ends at {frame_end}")
    return layers, cels


def save_and_verify(name: str, raw: bytes) -> bool:
    """Save a raw layer as PNG, reopen it, and print its verification result."""
    output = OUTPUT_DIR / f"{name}.png"
    Image.frombytes("RGBA", CANVAS_SIZE, raw).save(output, format="PNG")

    with Image.open(output) as image:
        actual_mode = image.mode
        actual_size = image.size
        reopened_raw = image.tobytes()

    actual_hash = hashlib.sha256(reopened_raw).hexdigest()
    alpha_is_opaque = len(reopened_raw) == RGBA_BYTE_COUNT and all(
        alpha == 255 for alpha in reopened_raw[3::4]
    )
    passed = (
        actual_mode == "RGBA"
        and actual_size == CANVAS_SIZE
        and alpha_is_opaque
        and actual_hash == EXPECTED_HASHES[name]
    )
    print(f"{'PASS' if passed else 'FAIL'} {output.relative_to(ROOT)} sha256={actual_hash}")
    if not passed:
        print(
            f"  expected: mode=RGBA size={CANVAS_SIZE} opaque_alpha=True "
            f"sha256={EXPECTED_HASHES[name]}"
        )
        print(
            f"  actual:   mode={actual_mode} size={actual_size} "
            f"opaque_alpha={alpha_is_opaque} sha256={actual_hash}"
        )
    return passed


def main() -> None:
    layers, cels = extract_layers(SOURCE)

    for name, expected_index in EXPECTED_INDICES.items():
        require(name in layers, f'Required layer "{name}" was not found')
        actual_index = layers.index(name)
        require(actual_index == expected_index, (
            f'Layer "{name}" has index {actual_index}, expected {expected_index}'
        ))
        require(actual_index in cels, f'Layer "{name}" has no cel in frame 0')

    results: list[bool] = []
    for name, layer_index in EXPECTED_INDICES.items():
        position, opacity, cel_type, size, raw = cels[layer_index]
        require(cel_type == 2, f'Layer "{name}" cel type is {cel_type}, expected 2')
        require(position == (0, 0), f'Layer "{name}" cel position is {position}, expected (0, 0)')
        require(size == CANVAS_SIZE, f'Layer "{name}" cel size is {size}, expected {CANVAS_SIZE}')
        require(opacity == 255, f'Layer "{name}" cel opacity is {opacity}, expected 255')
        require(len(raw) == RGBA_BYTE_COUNT, (
            f'Layer "{name}" decoded to {len(raw)} bytes, expected {RGBA_BYTE_COUNT}'
        ))
        results.append(save_and_verify(name, raw))

    require(all(results), "One or more saved PNGs failed verification")


if __name__ == "__main__":
    main()
