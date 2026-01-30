const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const miscDir = path.join(repoRoot, "misc");

function listMarkdownFiles() {
  if (!fs.existsSync(miscDir)) return [];
  return fs
    .readdirSync(miscDir)
    .filter((file) => file.toLowerCase().endsWith(".md"))
    .sort((a, b) => a.localeCompare(b));
}

function readFileText(file) {
  return fs.readFileSync(path.join(miscDir, file), "utf8");
}

function extractTitleAndBody(text, fallbackTitle) {
  const lines = String(text).split(/\r?\n/);
  let title = null;
  let startIndex = 0;

  if (lines[0] && lines[0].trim() === "---") {
    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (line === "---") {
        startIndex = i + 1;
        break;
      }
      const titleMatch = line.match(/^title:\s*(.+)$/i);
      if (titleMatch && !title) {
        title = titleMatch[1].trim();
      }
    }
  }

  for (let i = startIndex; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    const match = line.match(/^#{1,6}\s+(.*)$/);
    if (match) {
      title = title || match[1].trim();
      startIndex = i + 1;
      if (lines[startIndex] && !lines[startIndex].trim()) {
        startIndex += 1;
      }
    }
    break;
  }

  return {
    title: title || fallbackTitle,
    body: lines.slice(startIndex).join("\n")
  };
}

function toTitleFromFilename(filename) {
  const base = filename.replace(/\.md$/i, "");
  return base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInlineMarkdown(value) {
  let html = escapeHtml(String(value));
  html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, (match, alt, url, title) => {
    const titleAttr = title ? ` title="${title}"` : "";
    return `<img src="${url}" alt="${alt}"${titleAttr}>`;
  });
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>'
  );
  html = html.replace(/&lt;red&gt;([\s\S]*?)&lt;\/red&gt;/g, '<span class="markdown-red">$1</span>');
  html = html.replace(/\n/g, "<br>");
  return html;
}

function renderMarkdown(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (!text.trim()) return "";
  const lines = text.split(/\r?\n/);
  let html = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      i += 1;
      const codeLines = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) {
        i += 1;
      }
      const languageClass = language ? ` class="language-${escapeHtml(language)}"` : "";
      html += `<pre><code${languageClass}>${escapeHtml(codeLines.join("\n"))}</code></pre>`;
      continue;
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        html += `<h${level}>${renderInlineMarkdown(match[2])}</h${level}>`;
        i += 1;
        continue;
      }
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      html += `<blockquote>${renderMarkdown(quoteLines.join("\n"))}</blockquote>`;
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      html += "<hr>";
      i += 1;
      continue;
    }

    if (/^(-\s+|\*\s+)/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^(-\s+|\*\s+)/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^(-\s+|\*\s+)/, ""));
        i += 1;
      }
      html += `<ul>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`;
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      html += `<ol>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ol>`;
      continue;
    }

    const paragraphLines = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("```") &&
      !/^#{1,6}\s+/.test(lines[i].trim()) &&
      !/^>\s?/.test(lines[i].trim()) &&
      !/^(-\s+|\*\s+)/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^(-{3,}|\*{3,})$/.test(lines[i].trim())
    ) {
      paragraphLines.push(lines[i]);
      i += 1;
    }
    html += `<p>${renderInlineMarkdown(paragraphLines.join("\n"))}</p>`;
  }

  return html;
}

function buildHtmlPage({ title, content }) {
  return `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Mayank Nagda - notes">
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link
    href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap"
    rel="stylesheet">
  <link rel="stylesheet" href="../styles.css">
</head>

<body>
  <main class="page markdown-page">
    <header class="intro markdown-intro">
      <div class="intro__top">
        <a class="back-link" href="../index.html">← Back</a>
        <button class="theme-toggle" id="theme-toggle" type="button">Dark mode</button>
      </div>
      <h1>${escapeHtml(title)}</h1>
    </header>

    <section class="section markdown-section">
      <div class="markdown-body">${content}</div>
    </section>
  </main>

  <footer class="footer">&nbsp;</footer>

  <script>
    (function () {
      var button = document.getElementById("theme-toggle");
      if (!button) return;
      var saved = localStorage.getItem("theme");
      var isDark = saved === "dark";
      document.body.classList.toggle("theme-dark", isDark);
      button.textContent = isDark ? "Light mode" : "Dark mode";
      button.addEventListener("click", function () {
        var next = !document.body.classList.contains("theme-dark");
        document.body.classList.toggle("theme-dark", next);
        localStorage.setItem("theme", next ? "dark" : "light");
        button.textContent = next ? "Light mode" : "Dark mode";
      });
    })();
  </script>
</body>

</html>
`;
}

const files = listMarkdownFiles();
files.forEach((file) => {
  const fallbackTitle = toTitleFromFilename(file);
  const text = readFileText(file);
  const { title, body } = extractTitleAndBody(text, fallbackTitle);
  const html = buildHtmlPage({ title, content: renderMarkdown(body || text) });
  const outputName = file.replace(/\.md$/i, ".html");
  const outputPath = path.join(miscDir, outputName);
  fs.writeFileSync(outputPath, html, "utf8");
});
