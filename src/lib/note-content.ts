/**
 * Note-content helpers.
 *
 * Note content is written through the TipTap WYSIWYG editor and stored as HTML.
 * Legacy notes (created by the old raw-markdown textarea) still store markdown;
 * the helpers below detect and convert/strip both formats so previews, search,
 * and the editor work with either.
 */

const MARKDOWN_PATTERNS: RegExp[] = [
  /```/,
  /^#{1,6}\s+\S/m,
  /^\s{0,3}>\s+\S/m,
  /^\s{0,3}[-*+]\s+\S/m,
  /^\s{0,3}\d+\.\s+\S/m,
  /\*\*[^*]+\*\*/,
  /(^|\W)__[^_]+__(\W|$)/,
  /`[^`]+`/,
  /\[[^\]]+\]\([^)\s]+\)/,
];

/** True when the string looks like legacy markdown rather than HTML/plain text. */
export function looksLikeMarkdown(content: string): boolean {
  if (!content) return false;
  if (/<[a-z][\s\S]*>/i.test(content)) return false;
  return MARKDOWN_PATTERNS.some((pattern) => pattern.test(content));
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inlineMarkdownToHtml(escaped: string): string {
  return escaped
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|\W)__([^_]+)__(\W|$)/g, "$1<strong>$2</strong>$3")
    .replace(/(^|\W)\*([^*]+)\*(\W|$)/g, "$1<em>$2</em>$3")
    .replace(/(^|\W)_([^_]+)_(\W|$)/g, "$1<em>$2</em>$3");
}

/** Convert legacy markdown to the HTML subset the editor schema understands. */
export function markdownToHtml(content: string): string {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let list: { kind: "ul" | "ol"; items: string[] } | null = null;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${inlineMarkdownToHtml(escapeHtml(paragraph.join(" ")))}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      html.push(`<${list.kind}>${list.items.map((item) => `<li>${item}</li>`).join("")}</${list.kind}>`);
      list = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    const ordered = /^\s*\d+\.\s+(.*)$/.exec(line);
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const quote = /^\s*>\s?(.*)$/.exec(line);

    if (!trimmed) {
      flushParagraph();
      flushList();
    } else if (bullet) {
      flushParagraph();
      if (list?.kind !== "ul") flushList();
      list ??= { kind: "ul", items: [] };
      list.items.push(inlineMarkdownToHtml(escapeHtml(bullet[1])));
    } else if (ordered) {
      flushParagraph();
      if (list?.kind !== "ol") flushList();
      list ??= { kind: "ol", items: [] };
      list.items.push(inlineMarkdownToHtml(escapeHtml(ordered[1])));
    } else if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flushParagraph();
      flushList();
      html.push("<hr>");
    } else if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdownToHtml(escapeHtml(heading[2]))}</h${level}>`);
    } else if (quote) {
      flushParagraph();
      flushList();
      html.push(`<blockquote><p>${inlineMarkdownToHtml(escapeHtml(quote[1]))}</p></blockquote>`);
    } else {
      flushList();
      paragraph.push(trimmed);
    }
  }
  flushParagraph();
  flushList();
  return html.join("");
}

function htmlToPlainText(content: string): string {
  if (typeof window === "undefined") {
    return content
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"');
  }
  const container = window.document.createElement("div");
  container.innerHTML = content;
  return container.textContent ?? "";
}

function markdownToPlainText(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** One-line plain-text preview of a note (handles HTML and legacy markdown). */
export function plainPreview(content: string): string {
  if (!content) return "";
  const text = looksLikeMarkdown(content) ? markdownToPlainText(content) : htmlToPlainText(content);
  return text.replace(/\s+/g, " ").trim();
}
