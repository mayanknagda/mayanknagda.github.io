const REPO_OWNER = "mayanknagda";
const REPO_NAME = "mayanknagda.github.io";
const RAW_BASE_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/`;

const isGitHubPagesHost = window.location.hostname.endsWith(`${REPO_OWNER}.github.io`);
const isFileProtocol = window.location.protocol === "file:";

const dataCache = new Map();

const elements = {
  title: document.getElementById("markdown-title"),
  meta: document.getElementById("markdown-meta"),
  content: document.getElementById("markdown-content"),
  footer: document.getElementById("footer"),
  themeToggle: document.getElementById("theme-toggle")
};

initThemeToggle();
loadMarkdownPage();

async function loadMarkdownPage() {
  const params = new URLSearchParams(window.location.search);
  const doc = params.get("doc");

  if (!doc) {
    showMarkdownError("Missing markdown file.");
    renderFooter();
    return;
  }

  const safeName = doc.trim();
  if (!/^[A-Za-z0-9._-]+\.md$/.test(safeName)) {
    showMarkdownError("Invalid markdown file name.");
    renderFooter();
    return;
  }

  const path = `misc/${safeName}`;

  try {
    const { text } = await fetchMarkdownFile(path);
    const { title, body } = extractTitle(text, safeName);
    if (elements.title) {
      elements.title.textContent = title;
    }
    if (elements.meta) {
      elements.meta.textContent = path;
    }
    if (elements.content) {
      elements.content.innerHTML = renderMarkdown(body || text);
    }
    document.title = title;
  } catch (error) {
    console.error(error);
    showMarkdownError("Unable to load this markdown file.");
  }

  await renderFooter();
}

function showMarkdownError(message) {
  if (elements.title) {
    elements.title.textContent = "Not found";
  }
  if (elements.meta) {
    elements.meta.textContent = message;
  }
  if (elements.content) {
    elements.content.textContent = "";
  }
}

async function renderFooter() {
  if (!elements.footer) return;
  const year = new Date().getFullYear();
  let name = "";

  try {
    const profile = await fetchJSON("data/profile.json");
    name = profile?.name ?? "";
  } catch (error) {
    name = "";
  }

  const updatedLabel = getLastUpdatedLabel();
  const copy = name ? `© ${year} ${name}` : `© ${year}`;
  const parts = [copy, updatedLabel].filter(Boolean).join(" · ");
  elements.footer.textContent = parts;
}

function extractTitle(text, fallbackName) {
  const lines = String(text).split(/\r?\n/);
  let title = toTitleFromFilename(fallbackName);
  let startIndex = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    const match = line.match(/^#{1,6}\s+(.*)$/);
    if (match) {
      title = match[1].trim();
      startIndex = i + 1;
      if (lines[startIndex] && !lines[startIndex].trim()) {
        startIndex += 1;
      }
    }
    break;
  }

  return {
    title,
    body: lines.slice(startIndex).join("\n")
  };
}

function renderMarkdown(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (!text.trim()) return "";
  const blocks = text.split(/\n\s*\n/);
  return blocks.map((block) => renderMarkdownBlock(block)).join("");
}

function renderMarkdownBlock(block) {
  const trimmed = block.trim();
  if (!trimmed) return "";
  const lines = trimmed.split(/\n/);
  const headingMatch = lines[0].match(/^(#{1,6})\s+(.*)$/);
  if (headingMatch && lines.length === 1) {
    const level = headingMatch[1].length;
    const content = renderInlineMarkdown(headingMatch[2]);
    return `<h${level}>${content}</h${level}>`;
  }
  const isUnordered = lines.every((line) => /^[-*]\s+/.test(line));
  if (isUnordered) {
    const items = lines
      .map((line) => line.replace(/^[-*]\s+/, ""))
      .map((line) => `<li>${renderInlineMarkdown(line)}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  }
  const isOrdered = lines.every((line) => /^\d+\.\s+/.test(line));
  if (isOrdered) {
    const items = lines
      .map((line) => line.replace(/^\d+\.\s+/, ""))
      .map((line) => `<li>${renderInlineMarkdown(line)}</li>`)
      .join("");
    return `<ol>${items}</ol>`;
  }
  const paragraph = renderInlineMarkdown(lines.join("\n"));
  return `<p>${paragraph}</p>`;
}

function renderInlineMarkdown(value, options = {}) {
  if (value === null || value === undefined) return "";
  let html = escapeHtml(String(value));
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  if (options.stripLinks) {
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, "$1");
  } else {
    html = html.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );
  }
  html = html.replace(/&lt;red&gt;([\s\S]*?)&lt;\/red&gt;/g, '<span class="markdown-red">$1</span>');
  html = html.replace(/\n/g, "<br>");
  return html;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildSources(path) {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const local = cleanPath;
  const remote = `${RAW_BASE_URL}${cleanPath}`;

  if (isGitHubPagesHost || isFileProtocol) {
    return unique([remote, local]);
  }

  return unique([local, remote]);
}

async function fetchMarkdownFile(path) {
  try {
    const result = await fetchTextWithMeta(path);
    return result;
  } catch (error) {
    // fall through to API fetch
  }

  const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=main`;
  const response = await fetch(apiUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status} for ${apiUrl}`);
  }
  const data = await response.json();
  if (data && data.content) {
    const cleaned = String(data.content).replace(/\n/g, "");
    const binary = atob(cleaned);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const text = new TextDecoder("utf-8").decode(bytes);
    return { text, lastModified: data.last_modified ?? null };
  }
  throw new Error("Invalid GitHub API response for markdown file");
}

async function fetchTextWithMeta(path) {
  const sources = buildSources(path);
  let lastError = null;

  for (const source of sources) {
    try {
      const url = new URL(source, document.baseURI);
      url.searchParams.set("v", String(Date.now()));
      const response = await fetch(url.href, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status} for ${url.href}`);
      }
      const text = await response.text();
      const lastModified = response.headers.get("last-modified");
      return { text, lastModified };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error(`Failed to load ${path}`);
}

async function fetchJSON(path) {
  if (dataCache.has(path)) {
    return dataCache.get(path);
  }

  const sources = buildSources(path);
  let lastError = null;

  for (const source of sources) {
    try {
      const url = new URL(source, document.baseURI);
      url.searchParams.set("v", String(Date.now()));
      const response = await fetch(url.href, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status} for ${url.href}`);
      }
      const data = await response.json();
      dataCache.set(path, data);
      return data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error(`Failed to load ${path}`);
}

function unique(list) {
  return list.filter((value, index, array) => array.indexOf(value) === index);
}

function toTitleFromFilename(filename) {
  const base = filename.replace(/\.md$/i, "");
  return base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function initThemeToggle() {
  if (!elements.themeToggle) return;
  const savedTheme = localStorage.getItem("theme");
  const isDark = savedTheme === "dark";
  setTheme(isDark);
  elements.themeToggle.addEventListener("click", () => {
    setTheme(!document.body.classList.contains("theme-dark"));
  });
}

function setTheme(isDark) {
  document.body.classList.toggle("theme-dark", isDark);
  localStorage.setItem("theme", isDark ? "dark" : "light");
  if (elements.themeToggle) {
    elements.themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
  }
}

function getLastUpdatedLabel() {
  if (!document.lastModified) return "";
  const parsed = new Date(document.lastModified);
  if (Number.isNaN(parsed.getTime())) return "";
  const formatted = parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  return `Last updated ${formatted}`;
}
