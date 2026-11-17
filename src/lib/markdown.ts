function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function renderMarkdown(source: string) {
  const escaped = escapeHtml(source.trim())
  const withInline = escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(.+?)\*/g, "$1<em>$2</em>")
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noreferrer">$1</a>')
  const lines = withInline.split("\n")
  const html: string[] = []
  let list = false
  for (const line of lines) {
    if (line.startsWith("- ")) {
      if (!list) {
        html.push("<ul>")
        list = true
      }
      html.push(`<li>${line.slice(2)}</li>`)
      continue
    }
    if (list) {
      html.push("</ul>")
      list = false
    }
    html.push(line === "" ? "<br />" : `<p>${line}</p>`)
  }
  if (list) html.push("</ul>")
  return html.join("")
}
