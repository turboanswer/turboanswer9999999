// Strip the most common markdown artifacts from assistant output.
//
// The chat UI renders plain text (not markdown), so any **bold** / *italic* /
// # headings / `code` the model emits would otherwise show up as literal
// asterisks/hashes/backticks. The system prompt now forbids markdown, but old
// message history and edge cases can still leak it. This is a conservative
// cleaner: it only collapses well-formed pairs and uses lookbehind/lookahead
// so it does NOT touch arithmetic ("5*8") or snake_case identifiers.
//
// Markdown links [text](url) are converted to "text (url)" so the URL stays
// visible even though the chat is plain-text.
export function cleanMarkdown(text: string): string {
  if (!text) return text;
  let out = text;
  // Bold/italic emphasis: ***bold-italic***, **bold**, __bold__, *italic*, _italic_
  out = out.replace(/\*\*\*([^\s*][^*]*?)\*\*\*/g, '$1');
  out = out.replace(/\*\*([^\s*][^*]*?)\*\*/g, '$1');
  out = out.replace(/__([^\s_][^_]*?)__/g, '$1');
  out = out.replace(/(?<![A-Za-z0-9*])\*([^\s*][^*\n]*?)\*(?![A-Za-z0-9*])/g, '$1');
  out = out.replace(/(?<![A-Za-z0-9_])_([^\s_][^_\n]*?)_(?![A-Za-z0-9_])/g, '$1');
  // Inline code backticks: `code` → code (multi-line ``` blocks left alone)
  out = out.replace(/(?<!`)`([^`\n]+)`(?!`)/g, '$1');
  // ATX headings at start of line: "## Heading" → "Heading"
  out = out.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '');
  // Horizontal rules made of --- *** or ___
  out = out.replace(/^[ \t]*([-*_])\1{2,}[ \t]*$/gm, '');
  // Markdown links [text](url) → text (url) — keep URL visible
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1 ($2)');
  // Bullet markers: convert "* item" / "+ item" → "- item" for consistency
  out = out.replace(/^([ \t]*)[*+][ \t]+/gm, '$1- ');
  return out;
}
