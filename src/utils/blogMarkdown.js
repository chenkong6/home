function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderInline(text) {
  const codePlaceholders = []
  let output = escapeHtml(text)

  output = output.replace(/`([^`]+)`/g, (_, code) => {
    const index = codePlaceholders.push(code) - 1
    return `@@CODE_${index}@@`
  })

  output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
  output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  output = output.replace(/\*([^*]+)\*/g, '<em>$1</em>')

  return output.replace(/@@CODE_(\d+)@@/g, (_, index) => `<code>${codePlaceholders[index]}</code>`)
}

function flushParagraph(buffer, html) {
  if (!buffer.length) {
    return
  }

  html.push(`<p>${buffer.map((line) => renderInline(line)).join('<br>')}</p>`)
  buffer.length = 0
}

function flushList(items, html) {
  if (!items.length) {
    return
  }

  html.push(`<ul>${items.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ul>`)
  items.length = 0
}

export function markdownToHtml(source = '') {
  const lines = String(source).replace(/\r\n/g, '\n').split('\n')
  const html = []
  const paragraph = []
  const listItems = []
  const codeLines = []
  let inCodeBlock = false

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
        codeLines.length = 0
      } else {
        flushParagraph(paragraph, html)
        flushList(listItems, html)
      }

      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock) {
      codeLines.push(rawLine)
      continue
    }

    if (!trimmed) {
      flushParagraph(paragraph, html)
      flushList(listItems, html)
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      flushParagraph(paragraph, html)
      flushList(listItems, html)
      const level = headingMatch[1].length
      html.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`)
      continue
    }

    const quoteMatch = trimmed.match(/^>\s+(.*)$/)
    if (quoteMatch) {
      flushParagraph(paragraph, html)
      flushList(listItems, html)
      html.push(`<blockquote>${renderInline(quoteMatch[1])}</blockquote>`)
      continue
    }

    const listMatch = trimmed.match(/^[-*+]\s+(.*)$/)
    if (listMatch) {
      flushParagraph(paragraph, html)
      listItems.push(listMatch[1])
      continue
    }

    flushList(listItems, html)
    paragraph.push(trimmed)
  }

  flushParagraph(paragraph, html)
  flushList(listItems, html)

  if (inCodeBlock && codeLines.length) {
    html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
  }

  return html.join('')
}

export function excerptFromMarkdown(source = '', maxLength = 160) {
  const text = String(source)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[>#*_`\[\]()!-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}...` : text
}
