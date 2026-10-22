/** Extract the actual copyable example rather than maintaining a second fixture. */
export function extractQuickstart(markdown, filename) {
  const start = '<!-- quickstart:start -->';
  const end = '<!-- quickstart:end -->';
  if (
    markdown.split(start).length !== 2 ||
    markdown.split(end).length !== 2 ||
    markdown.indexOf(start) >= markdown.indexOf(end)
  ) {
    throw new Error(`${filename}: expected exactly one marked quick start`);
  }
  const section = markdown.split(start)[1].split(end)[0];
  const blocks = [...section.matchAll(/^```tsx\r?\n([\s\S]*?)^```\s*$/gm)];
  if (blocks.length !== 1 || !blocks[0][1].trim()) {
    throw new Error(`${filename}: expected one complete TSX quick start`);
  }
  return blocks[0][1];
}
