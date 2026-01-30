const REPO_OWNER = "mayanknagda";
const REPO_NAME = "mayanknagda.github.io";
const RAW_BASE_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/`;

const isGitHubPagesHost = window.location.hostname.endsWith(`${REPO_OWNER}.github.io`);
const isFileProtocol = window.location.protocol === "file:";

const dataCache = new Map();

const elements = {
  name: document.getElementById("name"),
  nowText: document.getElementById("now-text"),
  meta: document.getElementById("meta"),
  newList: document.getElementById("new-list"),
  newListArchive: document.getElementById("new-list-archive"),
  newDetails: document.getElementById("new-details"),
  timelineExperience: document.getElementById("timeline-experience"),
  timelineExperienceArchive: document.getElementById("timeline-experience-archive"),
  timelineExperienceDetails: document.getElementById("timeline-experience-details"),
  timelineEducation: document.getElementById("timeline-education"),
  timelineEducationArchive: document.getElementById("timeline-education-archive"),
  timelineEducationDetails: document.getElementById("timeline-education-details"),
  bioText: document.getElementById("bio-text"),
  publicationsList: document.getElementById("publications-list"),
  miscList: document.getElementById("misc-list"),
  footer: document.getElementById("footer"),
  themeToggle: document.getElementById("theme-toggle")
};

initThemeToggle();
loadPage();

async function loadPage() {
  try {
    const [profile, publications] = await Promise.all([
      fetchJSON("data/profile.json"),
      fetchJSON("data/publications.json").catch(() => null)
    ]);

    if (profile) {
      document.title = profile.name ?? "Home";
      setText(elements.name, profile.name);
      renderNow(profile);
      renderMeta(profile);
      renderNews(profile.news);
      renderTimeline(profile);
      renderBio(profile);
      renderPublications(publications);
      await renderMisc(profile.misc);
      renderFooter(profile);
    }
  } catch (error) {
    console.error(error);
    showLoadError();
  }
}

function renderMeta(profile) {
  if (!elements.meta) return;
  elements.meta.innerHTML = "";
  const metaItems = profile.meta ?? profile.hero?.meta ?? [];

  if (!metaItems.length) return;

  metaItems.forEach((item) => {
    if (!item?.label && !item?.display) return;
    const li = document.createElement("li");
    if (item.url) {
      const link = document.createElement("a");
      link.href = item.url;
      link.textContent = item.display ?? item.label;
      if (item.external) {
        link.target = "_blank";
        link.rel = "noopener";
      }
      li.appendChild(link);
    } else {
      li.textContent = item.display ?? item.label;
    }
    elements.meta.appendChild(li);
  });
}

function renderNow(profile) {
  if (!elements.nowText) return;
  const now = profile.now ?? profile.hero?.now ?? "";
  if (!now) {
    elements.nowText.hidden = true;
    return;
  }
  elements.nowText.hidden = false;
  elements.nowText.innerHTML = renderInlineMarkdown(now);
}

function renderNews(news) {
  if (!elements.newList) return;
  elements.newList.innerHTML = "";
  const items = Array.isArray(news) ? news : [];

  if (!items.length) {
    elements.newList.innerHTML = "<li>No updates yet.</li>";
    if (elements.newDetails) {
      elements.newDetails.hidden = true;
    }
    return;
  }

  const topItems = items.slice(0, 3);
  const restItems = items.slice(3);

  topItems.forEach((item) => {
    elements.newList.appendChild(createNewsItem(item));
  });

  if (elements.newListArchive && elements.newDetails) {
    elements.newListArchive.innerHTML = "";
    if (restItems.length) {
      restItems.forEach((item) => {
        elements.newListArchive.appendChild(createNewsItem(item));
      });
      elements.newDetails.hidden = false;
    } else {
      elements.newDetails.hidden = true;
    }
  }
}

function renderTimeline(profile) {
  if (!elements.timelineExperience || !elements.timelineEducation) return;
  elements.timelineExperience.innerHTML = "";
  elements.timelineEducation.innerHTML = "";
  if (elements.timelineExperienceArchive) {
    elements.timelineExperienceArchive.innerHTML = "";
  }
  if (elements.timelineEducationArchive) {
    elements.timelineEducationArchive.innerHTML = "";
  }

  const experience = (Array.isArray(profile.experience) ? profile.experience : []).map((item) => ({
    start: item.start,
    end: item.end,
    title: [item.role, item.organization].filter(Boolean).join(" — "),
    meta: [item.location, item.type].filter(Boolean).join(" · ")
  }));

  const education = (Array.isArray(profile.education) ? profile.education : []).map((item) => ({
    start: item.start,
    end: item.end,
    title: [item.degree, item.institution].filter(Boolean).join(" — "),
    meta: item.location
  }));

  const sortedExperience = experience.sort((a, b) => (parseDate(b.start) ?? 0) - (parseDate(a.start) ?? 0));
  const sortedEducation = education.sort((a, b) => (parseDate(b.start) ?? 0) - (parseDate(a.start) ?? 0));

  const experienceTop = sortedExperience.slice(0, 2);
  const experienceRest = sortedExperience.slice(2);
  const educationTop = sortedEducation.slice(0, 1);
  const educationRest = sortedEducation.slice(1);

  renderTimelineList(elements.timelineExperience, experienceTop);
  renderTimelineList(elements.timelineEducation, educationTop);

  if (elements.timelineExperienceArchive && elements.timelineExperienceDetails) {
    renderTimelineList(elements.timelineExperienceArchive, experienceRest);
    elements.timelineExperienceDetails.hidden = !experienceRest.length;
  }

  if (elements.timelineEducationArchive && elements.timelineEducationDetails) {
    renderTimelineList(elements.timelineEducationArchive, educationRest);
    elements.timelineEducationDetails.hidden = !educationRest.length;
  }
}

function renderBio(profile) {
  if (!elements.bioText) return;
  setMarkdown(elements.bioText, profile.bio ?? "");
}

function renderPublications(publicationsData) {
  if (!elements.publicationsList) return;
  elements.publicationsList.innerHTML = "";
  const publications = getPublicationsArray(publicationsData)
    .filter((pub) => pub.type !== "Preprint")
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    .slice(0, 5);

  if (!publications.length) {
    elements.publicationsList.innerHTML = "<li>No publications listed yet.</li>";
    return;
  }

  publications.forEach((pub) => {
    const li = document.createElement("li");
    const meta = [pub.venue, pub.year].filter(Boolean).join(", ");
    if (pub.link) {
      const link = document.createElement("a");
      link.href = pub.link;
      link.innerHTML = renderInlineMarkdown(pub.title ?? "", { stripLinks: true });
      link.target = "_blank";
      link.rel = "noopener";
      li.appendChild(link);
    } else {
      li.innerHTML = renderInlineMarkdown(pub.title ?? "");
    }
    if (meta) {
      const detail = document.createElement("span");
      detail.innerHTML = ` — ${renderInlineMarkdown(meta)}`;
      li.appendChild(detail);
    }
    elements.publicationsList.appendChild(li);
  });
}

async function renderMisc(misc) {
  if (!elements.miscList) return;
  elements.miscList.innerHTML = "";
  const items = Array.isArray(misc) ? misc : [];
  let markdownItems = [];

  try {
    markdownItems = await fetchMiscMarkdowns();
  } catch (error) {
    console.warn("Unable to load misc markdowns", error);
  }

  const recentMarkdowns = markdownItems
    .filter((entry) => entry.date)
    .sort((a, b) => b.date - a.date)
    .concat(markdownItems.filter((entry) => !entry.date))
    .slice(0, 4);

  const combinedItems = [
    ...recentMarkdowns.map((entry) => ({
      label: entry.title,
      url: buildMiscLink(entry.file),
      external: false,
      date: entry.date
    })),
    ...items
  ];

  if (!combinedItems.length) {
    elements.miscList.innerHTML = "<li>More soon.</li>";
    return;
  }

  combinedItems.forEach((item) => {
    const li = document.createElement("li");
    if (typeof item === "string") {
      li.innerHTML = renderInlineMarkdown(item);
    } else if (item?.label) {
      if (item.url) {
        const link = document.createElement("a");
        link.href = item.url;
        link.innerHTML = renderInlineMarkdown(item.label ?? "", { stripLinks: true });
        if (item.external) {
          link.target = "_blank";
          link.rel = "noopener";
        }
        li.appendChild(link);
      } else {
        li.innerHTML = renderInlineMarkdown(item.label ?? "");
      }
      const formattedDate = item.date ? formatDate(item.date) : "";
      if (formattedDate) {
        const detail = document.createElement("span");
        detail.className = "misc-date";
        detail.textContent = ` — ${formattedDate}`;
        li.appendChild(detail);
      }
      if (item.note) {
        const detail = document.createElement("span");
        detail.innerHTML = ` — ${renderInlineMarkdown(item.note)}`;
        li.appendChild(detail);
      }
    }
    elements.miscList.appendChild(li);
  });
}

function renderFooter(profile) {
  if (!elements.footer) return;
  const year = new Date().getFullYear();
  const note = profile.footer?.note ?? "";
  const updatedLabel = getLastUpdatedLabel();
  const copy = `© ${year} ${profile.name ?? ""}`;
  const parts = [copy, note, updatedLabel].filter(Boolean).join(" · ");
  elements.footer.textContent = parts;
}

function createNewsItem(item) {
  const li = document.createElement("li");
  const title = item.title ?? "Update";
  if (item.date) {
    const date = document.createElement("span");
    date.className = "news-date";
    date.textContent = `${item.date} · `;
    li.appendChild(date);
  }
  if (item.link) {
    const link = document.createElement("a");
    link.href = item.link;
    link.innerHTML = renderInlineMarkdown(title, { stripLinks: true });
    link.target = "_blank";
    link.rel = "noopener";
    li.appendChild(link);
  } else {
    const span = document.createElement("span");
    span.innerHTML = renderInlineMarkdown(title);
    li.appendChild(span);
  }
  if (item.description) {
    const detail = document.createElement("span");
    detail.className = "news-detail";
    detail.innerHTML = ` — ${renderInlineMarkdown(item.description)}`;
    li.appendChild(detail);
  }
  return li;
}

function setText(element, value) {
  if (!element) return;
  element.textContent = value ?? "";
}

function setMarkdown(element, value) {
  if (!element) return;
  element.innerHTML = renderMarkdown(value ?? "");
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
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getPublicationsArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.publications)) return data.publications;
  return [];
}

function showLoadError() {
  if (elements.bioText) {
    elements.bioText.textContent =
      "Unable to load data. If you are previewing locally, run a static server (e.g. `python -m http.server`).";
  }
}

function getLastUpdatedLabel() {
  if (!document.lastModified) return "";
  const parsed = new Date(document.lastModified);
  if (Number.isNaN(parsed.getTime())) return "";
  const formatted = parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  return `Last updated ${formatted}`;
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

function renderTimelineList(container, items) {
  container.innerHTML = "";
  items
    .forEach((item) => {
      const li = document.createElement("li");
      const date = document.createElement("div");
      date.className = "timeline__date";
      date.textContent = [item.start, item.end].filter(Boolean).join(" – ");

      const detail = document.createElement("div");
      detail.className = "timeline__detail";
      detail.innerHTML = renderInlineMarkdown([item.title, item.meta].filter(Boolean).join(" · "));

      li.append(date, detail);
      container.appendChild(li);
    });
}

function parseDate(value) {
  if (!value) return null;
  const cleaned = value.replace(/\(.*\)/g, "").replace(/present/i, "").trim();
  if (!cleaned) return null;
  const parsed = Date.parse(cleaned);
  if (!Number.isNaN(parsed)) return parsed;
  const yearMatch = cleaned.match(/\d{4}/);
  if (yearMatch) {
    const yearParsed = Date.parse(`${yearMatch[0]}-01-01`);
    return Number.isNaN(yearParsed) ? null : yearParsed;
  }
  return null;
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

function buildMiscLink(filename) {
  const htmlName = filename.replace(/\.md$/i, ".html");
  return `misc/${encodeURIComponent(htmlName)}`;
}

function normalizeMiscManifest(manifest) {
  if (!manifest) return [];
  const list = Array.isArray(manifest) ? manifest : manifest.files;
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      if (typeof item === "string") {
        return { file: item, title: toTitleFromFilename(item) };
      }
      if (item?.file) {
        return {
          file: item.file,
          title: item.title || toTitleFromFilename(item.file),
          date: item.date || null
        };
      }
      return null;
    })
    .filter(Boolean);
}

async function fetchMiscMarkdowns() {
  const manifest = await fetchJSON("misc/index.json").catch(() => null);
  const manifestEntries = normalizeMiscManifest(manifest);
  if (manifestEntries.length) {
    return manifestEntries;
  }

  const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/misc`;

  try {
    const response = await fetch(apiUrl, { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        const entries = data
          .filter((item) => item.type === "file" && item.name.toLowerCase().endsWith(".md"))
          .map((item) => ({
            file: item.name,
            title: toTitleFromFilename(item.name)
          }))
          .sort((a, b) => a.title.localeCompare(b.title));
        return await hydrateMarkdownMeta(entries);
      }
    }
  } catch (error) {
    console.warn("GitHub misc fetch failed", error);
  }

  const directoryEntries = await fetchMiscFromDirectoryListing();
  if (directoryEntries.length) {
    return await hydrateMarkdownMeta(directoryEntries);
  }

  return [];
}

function toTitleFromFilename(filename) {
  const base = filename.replace(/\.md$/i, "");
  return base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function hydrateMarkdownMeta(entries) {
  if (!entries.length) return entries;
  const updates = await Promise.all(
    entries.map(async (entry) => {
      try {
        const { text, lastModified } = await fetchTextWithMeta(`misc/${entry.file}`);
        const meta = extractMarkdownMeta(text);
        const title = meta.title || entry.title;
        const date = meta.date ? new Date(meta.date) : lastModified ? new Date(lastModified) : null;
        return { ...entry, title, date: date && !Number.isNaN(date.getTime()) ? date : null };
      } catch (error) {
        return entry;
      }
    })
  );
  return updates;
}

function extractMarkdownMeta(text) {
  const lines = String(text).split(/\r?\n/);
  let title = null;
  let date = null;

  if (lines[0] && lines[0].trim() === "---") {
    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (line === "---") break;
      const titleMatch = line.match(/^title:\s*(.+)$/i);
      if (titleMatch && !title) {
        title = titleMatch[1].trim();
      }
      const dateMatch = line.match(/^date:\s*(.+)$/i);
      if (dateMatch && !date) {
        date = dateMatch[1].trim();
      }
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (!title) {
      const match = trimmed.match(/^#{1,6}\s+(.*)$/);
      if (match) {
        title = match[1].trim();
      }
    }
    if (!date) {
      const dateMatch = trimmed.match(/^date:\s*(.+)$/i);
      if (dateMatch) {
        date = dateMatch[1].trim();
      }
    }
    if (title && date) break;
  }

  return { title, date };
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

async function fetchMiscFromDirectoryListing() {
  try {
    const { text } = await fetchTextWithMeta("misc/");
    const matches = [...text.matchAll(/href="([^"]+\\.md)"/gi)];
    const files = matches
      .map((match) => match[1].split("/").pop())
      .filter((file) => file && file.toLowerCase().endsWith(".md"));
    const uniqueFiles = [...new Set(files)];
    return uniqueFiles.map((file) => ({ file, title: toTitleFromFilename(file) }));
  } catch (error) {
    return [];
  }
}

function formatDate(date) {
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
