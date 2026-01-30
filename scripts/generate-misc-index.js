const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const miscDir = path.join(repoRoot, "misc");
const outputPath = path.join(miscDir, "index.json");

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

function extractTitleAndDate(text, fallbackTitle) {
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

  return {
    title: title || fallbackTitle,
    date
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

function getCreatedDate(file) {
  try {
    const output = execSync(`git log --diff-filter=A --follow --format=%aI -1 -- misc/${file}`, {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "ignore"]
    })
      .toString()
      .trim();
    if (output) return output;
  } catch (error) {
    // ignore
  }

  try {
    const output = execSync(`git log -1 --format=%aI -- misc/${file}`, {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "ignore"]
    })
      .toString()
      .trim();
    if (output) return output;
  } catch (error) {
    // ignore
  }

  return null;
}

const files = listMarkdownFiles();
const entries = files.map((file) => {
  const fallbackTitle = toTitleFromFilename(file);
  const text = readFileText(file);
  const meta = extractTitleAndDate(text, fallbackTitle);
  const createdDate = getCreatedDate(file);
  return {
    file,
    title: meta.title,
    date: meta.date || createdDate
  };
});

const output = JSON.stringify({ files: entries }, null, 2) + "\n";
fs.writeFileSync(outputPath, output, "utf8");
