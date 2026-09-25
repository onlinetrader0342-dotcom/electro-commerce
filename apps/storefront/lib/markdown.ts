/**
 * Tiny server-side Markdown renderer for blog content.
 *
 * Deliberately dependency-free and XSS-safe: raw HTML in the source is
 * escaped, and link/image URLs are allow-listed. Supports the subset blog
 * authors need: headings, paragraphs, bold/italic, inline code, fenced code
 * blocks, links, images, blockquotes, ordered/unordered lists, hr.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSafeUrl(url: string): boolean {
  const u = url.trim();
  return (
    u.startsWith("http://") ||
    u.startsWith("https://") ||
    u.startsWith("mailto:") ||
    u.startsWith("/") ||
    u.startsWith("#")
  );
}

function renderInline(src: string): string {
  // Extract inline code spans first so their contents are never transformed.
  const codeSpans: string[] = [];
  let text = src.replace(/`([^`\n]+)`/g, (_m, code: string) => {
    codeSpans.push(`<code>${escapeHtml(code)}</code>`);
    return `%%EC_CODESPAN_${codeSpans.length - 1}%%`;
  });

  text = escapeHtml(text);

  // Images: ![alt](src)
  text = text.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
    (_m, alt: string, url: string) =>
      isSafeUrl(url)
        ? `<img src="${escapeHtml(url)}" alt="${alt}" loading="lazy" />`
        : alt,
  );
  // Links: [text](url)
  text = text.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
    (_m, label: string, url: string) =>
      isSafeUrl(url)
        ? `<a href="${escapeHtml(url)}">${label}</a>`
        : label,
  );
  // Bold + italic
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(^|\W)\*([^*\n]+)\*/g, "$1<em>$2</em>");
  text = text.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  text = text.replace(/(^|\W)_([^_\n]+)_/g, "$1<em>$2</em>");

  // Restore code spans.
  text = text.replace(/%%EC_CODESPAN_(\d+)%%/g, (_m, i: string) => codeSpans[Number(i)] ?? "");
  return text;
}

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let i = 0;
  let inCodeFence = false;
  let codeLang = "";
  const codeBuf: string[] = [];

  const flushParagraph = (buf: string[]) => {
    if (buf.length) html.push(`<p>${renderInline(buf.join(" "))}</p>`);
  };

  let para: string[] = [];

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code blocks
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      if (!inCodeFence) {
        inCodeFence = true;
        codeLang = fence[1];
        flushParagraph(para);
        para = [];
      } else {
        inCodeFence = false;
        const cls = codeLang ? ` class="language-${escapeHtml(codeLang)}"` : "";
        html.push(
          `<pre><code${cls}>${escapeHtml(codeBuf.join("\n"))}</code></pre>`,
        );
        codeBuf.length = 0;
      }
      i++;
      continue;
    }
    if (inCodeFence) {
      codeBuf.push(line);
      i++;
      continue;
    }

    if (/^\s*$/.test(line)) {
      flushParagraph(para);
      para = [];
      i++;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph(para);
      para = [];
      const level = heading[1].length;
      html.push(`<h${level}>${renderInline(heading[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      flushParagraph(para);
      para = [];
      html.push("<hr />");
      i++;
      continue;
    }

    const qm = line.match(/^>\s?(.*)$/);
    if (qm) {
      flushParagraph(para);
      para = [];
      const qLines: string[] = [qm[1]];
      i++;
      while (i < lines.length) {
        const q2 = lines[i].match(/^>\s?(.*)$/);
        if (!q2) break;
        qLines.push(q2[1]);
        i++;
      }
      html.push(`<blockquote><p>${renderInline(qLines.join(" "))}</p></blockquote>`);
      continue;
    }

    // Tables: header row followed by a delimiter row (| --- | --- |).
    if (line.includes("|")) {
      const delim = lines[i + 1] ?? "";
      if (/^\|?[\s:|/-]*-[\s:|/-]*\|?$/.test(delim) && delim.includes("|")) {
        flushParagraph(para);
        para = [];
        const parseRow = (r: string) =>
          r
            .trim()
            .replace(/^\||\|$/g, "")
            .split("|")
            .map((c) => c.trim());
        const header = parseRow(line);
        i += 2; // skip header + delimiter
        const rows: string[][] = [];
        while (i < lines.length && lines[i].includes("|")) {
          rows.push(parseRow(lines[i]));
          i++;
        }
        const thead = `<thead><tr>${header.map((c) => `<th>${renderInline(c)}</th>`).join("")}</tr></thead>`;
        const tbody = `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${renderInline(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
        html.push(`<table>${thead}${tbody}</table>`);
        continue;
      }
    }

    const listMatch = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (listMatch) {
      flushParagraph(para);
      para = [];
      const ordered = /^\d/.test(listMatch[2]);
      const items: string[] = [];
      while (i < lines.length) {
        const lm = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
        if (!lm) break;
        items.push(`<li>${renderInline(lm[3])}</li>`);
        i++;
      }
      html.push(ordered ? `<ol>${items.join("")}</ol>` : `<ul>${items.join("")}</ul>`);
      continue;
    }

    para.push(line.trim());
    i++;
  }
  flushParagraph(para);
  if (inCodeFence && codeBuf.length) {
    html.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
  }
  return html.join("\n");
}
