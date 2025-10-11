const REPO_OWNER = "mayanknagda";
const REPO_NAME = "mayanknagda.github.io";
const RAW_BASE_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/`;

const isGitHubPagesHost = window.location.hostname.endsWith(`${REPO_OWNER}.github.io`);
const isFileProtocol = window.location.protocol === "file:";

const dataCache = new Map();

const elements = {
  brandName: document.getElementById("brand-name"),
  brandTagline: document.getElementById("brand-tagline"),
  heroIntro: document.getElementById("hero-intro"),
  heroTitle: document.getElementById("hero-title"),
  heroSummary: document.getElementById("hero-summary"),
  heroMeta: document.getElementById("hero-meta"),
  heroActions: document.getElementById("hero-actions"),
  experienceIntro: document.getElementById("experience-intro"),
  experienceList: document.getElementById("experience-list"),
  projectsIntro: document.getElementById("projects-intro"),
  projectsList: document.getElementById("projects-list"),
  projectsActions: document.getElementById("projects-actions"),
  educationIntro: document.getElementById("education-intro"),
  educationList: document.getElementById("education-list"),
  publicationsIntro: document.getElementById("publications-intro"),
  publicationsList: document.getElementById("publications-list"),
  publicationsActions: document.getElementById("publications-actions"),
  skillsIntro: document.getElementById("skills-intro"),
  skillsList: document.getElementById("skills-list"),
  footerNote: document.getElementById("footer-note"),
  footerLinks: document.getElementById("footer-links"),
  themeToggle: document.getElementById("theme-toggle"),
  pageHeroPretitle: document.getElementById("page-hero-pretitle"),
  pageHeroTitle: document.getElementById("page-hero-title"),
  pageHeroSummary: document.getElementById("page-hero-summary"),
  pageHeroActions: document.getElementById("page-hero-actions"),
  projectsPageIntro: document.getElementById("projects-page-intro"),
  projectsPageList: document.getElementById("projects-page-list"),
  publicationsPageIntro: document.getElementById("publications-page-intro"),
  publicationsPageList: document.getElementById("publications-page-list")
};

const PUBLICATION_TYPE_ORDER = ["Journal", "Conference", "Workshop", "Preprint", "Thesis", "Other"];

initTheme();
attachEventListeners();
loadPage();

async function loadPage() {
  const page = document.body.dataset.page || "home";

  try {
    if (page === "projects") {
      await loadProjectsPage();
    } else if (page === "publications") {
      await loadPublicationsPage();
    } else {
      await loadHomePage();
    }
    highlightNavigation(page);
  } catch (error) {
    console.error(error);
    showLoadError(page);
  }
}

async function loadHomePage() {
  const [profile, projects, publications] = await Promise.all([
    fetchJSON("data/profile.json"),
    fetchJSON("data/projects.json").catch(() => null),
    fetchJSON("data/publications.json").catch(() => null)
  ]);

  if (profile) {
    document.title = `${profile.name ?? "Portfolio"} | ${profile.tagline ?? "Generative AI"}`;
    applyBrand(profile);
    renderHeroSection(profile);
    renderExperience(profile);
    renderEducation(profile);
    renderSkills(profile);
    renderFooter(profile);
  }

  renderProjectsHome(projects);
  renderPublicationsHome(publications);
}

async function loadProjectsPage() {
  const [profile, projects] = await Promise.all([
    fetchJSON("data/profile.json"),
    fetchJSON("data/projects.json").catch(() => null)
  ]);

  if (profile) {
    document.title = `${profile.name ?? "Portfolio"} | Projects`;
    applyBrand(profile);
    renderPageHero(profile.pages?.projects);
    renderFooter(profile);
  }

  renderProjectsDetailed(projects);
}

async function loadPublicationsPage() {
  const [profile, publications] = await Promise.all([
    fetchJSON("data/profile.json"),
    fetchJSON("data/publications.json").catch(() => null)
  ]);

  if (profile) {
    document.title = `${profile.name ?? "Portfolio"} | Publications`;
    applyBrand(profile);
    renderPageHero(profile.pages?.publications);
    renderFooter(profile);
  }

  renderPublicationsDetailed(publications);
}

function applyBrand(profile) {
  if (!profile) return;
  setText(elements.brandName, profile.name);
  setText(elements.brandTagline, profile.tagline);
}

function renderHeroSection(profile) {
  if (!profile?.hero) return;
  const { hero } = profile;
  setText(elements.heroIntro, hero.pretitle);
  setText(elements.heroTitle, hero.title ?? profile.tagline);
  setText(elements.heroSummary, hero.summary ?? profile.summary);

  if (elements.heroMeta) {
    elements.heroMeta.innerHTML = "";
    safeArray(hero.meta).forEach((meta) => {
      if (!meta?.label) return;
      const isLink = Boolean(meta.url);
      const el = document.createElement(isLink ? "a" : "span");
      el.className = isLink ? "hero__meta-link" : "hero__meta-item";
      el.textContent = meta.display ?? meta.label;
      if (isLink) {
        el.href = meta.url;
        if (meta.external) {
          el.target = "_blank";
          el.rel = "noopener";
        }
      }
      elements.heroMeta.appendChild(el);
    });
  }

  renderActions(elements.heroActions, hero.actions);
}

function renderExperience(profile) {
  if (!elements.experienceList) return;
  setText(elements.experienceIntro, profile.sections?.experience);
  elements.experienceList.innerHTML = "";

  safeArray(profile.experience).forEach((item) => {
    const card = document.createElement("article");
    card.className = "card";

    const metaRow = document.createElement("div");
    metaRow.className = "card__meta";
    const dates = [item.start, item.end].filter(Boolean).join(" – ");
    [dates, item.location, item.type].filter(Boolean).forEach((meta) => {
      const span = document.createElement("span");
      span.textContent = meta;
      metaRow.appendChild(span);
    });

    const title = document.createElement("h3");
    title.className = "card__title";
    title.textContent = [item.role, item.organization].filter(Boolean).join(" — ");

    card.append(metaRow, title);

    if (Array.isArray(item.skills) && item.skills.length) {
      const chipRow = document.createElement("div");
      chipRow.className = "chip-row";
      item.skills.forEach((skill) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = skill;
        chipRow.appendChild(chip);
      });
      card.appendChild(chipRow);
    }

    if (Array.isArray(item.highlights) && item.highlights.length) {
      card.appendChild(createList(item.highlights));
    }

    elements.experienceList.appendChild(card);
  });
}

function renderProjectsHome(projectsData) {
  if (!elements.projectsList) return;
  setText(elements.projectsIntro, fetchSectionCopy("projects"));
  elements.projectsList.innerHTML = "";

  const projects = getProjectsArray(projectsData)
    .filter((project) => project.featured !== false)
    .slice(0, 5);

  if (!projects.length) {
    elements.projectsList.innerHTML = "<p>No projects to display yet. Check back soon!</p>";
    renderActions(elements.projectsActions, [{ label: "View all projects", url: "projects.html" }]);
    return;
  }

  projects.forEach((project) => {
    elements.projectsList.appendChild(createProjectCard(project, { layout: "compact" }));
  });

  renderActions(elements.projectsActions, [{ label: "View all projects", url: "projects.html" }]);
}

function renderProjectsDetailed(projectsData) {
  if (!elements.projectsPageList) return;
  elements.projectsPageList.innerHTML = "";

  const projects = getProjectsArray(projectsData);

  if (!projects.length) {
    elements.projectsPageList.innerHTML = "<p>Projects will be added soon. Stay tuned!</p>";
    setText(elements.projectsPageIntro, fetchPageIntro("projects"));
    return;
  }

  setText(elements.projectsPageIntro, fetchPageIntro("projects"));

  projects.forEach((project) => {
    elements.projectsPageList.appendChild(createProjectCard(project, { layout: "detailed" }));
  });
}

function renderEducation(profile) {
  if (!elements.educationList) return;
  setText(elements.educationIntro, profile.sections?.education);
  elements.educationList.innerHTML = "";

  safeArray(profile.education).forEach((item) => {
    const card = document.createElement("article");
    card.className = "card";

    const metaRow = document.createElement("div");
    metaRow.className = "card__meta";
    const dates = [item.start, item.end].filter(Boolean).join(" – ");
    [dates, item.location].filter(Boolean).forEach((meta) => {
      const span = document.createElement("span");
      span.textContent = meta;
      metaRow.appendChild(span);
    });

    const title = document.createElement("h3");
    title.className = "card__title";
    title.textContent = item.degree;

    const subtitle = document.createElement("p");
    subtitle.className = "card__subtitle";
    subtitle.textContent = item.institution;

    card.append(metaRow, title, subtitle);

    if (Array.isArray(item.focus) && item.focus.length) {
      const focus = document.createElement("p");
      focus.className = "card__subtitle";
      focus.textContent = `Focus: ${item.focus.join(", ")}`;
      card.appendChild(focus);
    }

    if (Array.isArray(item.highlights) && item.highlights.length) {
      card.appendChild(createList(item.highlights));
    }

    elements.educationList.appendChild(card);
  });
}

function renderPublicationsHome(publicationsData) {
  if (!elements.publicationsList) return;
  setText(elements.publicationsIntro, fetchSectionCopy("publications"));
  elements.publicationsList.innerHTML = "";

  const publications = getPublicationsArray(publicationsData)
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

  const topPubs = publications.filter((pub) => pub.featured !== false).slice(0, 5);
  const display = topPubs.length ? topPubs : publications.slice(0, 5);

  if (!display.length) {
    elements.publicationsList.innerHTML = "<p>Publications will be listed here soon.</p>";
    renderActions(elements.publicationsActions, [{ label: "View all publications", url: "publications.html" }]);
    return;
  }

  display.forEach((pub) => {
    elements.publicationsList.appendChild(createPublicationCard(pub, { layout: "compact" }));
  });

  renderActions(elements.publicationsActions, [{ label: "View all publications", url: "publications.html" }]);
}

function renderPublicationsDetailed(publicationsData) {
  if (!elements.publicationsPageList) return;
  elements.publicationsPageList.innerHTML = "";

  const publications = getPublicationsArray(publicationsData);
  setText(elements.publicationsPageIntro, fetchPageIntro("publications"));

  if (!publications.length) {
    elements.publicationsPageList.innerHTML = "<p>Publication information will be added soon.</p>";
    return;
  }

  const grouped = groupPublications(publications);

  grouped.forEach(({ type, items }) => {
    const groupSection = document.createElement("section");
    groupSection.className = "publication-group";

    const heading = document.createElement("h3");
    heading.className = "publication-group__title";
    heading.textContent = type;

    const grid = document.createElement("div");
    grid.className = "publication-grid";

    items.forEach((pub) => {
      grid.appendChild(createPublicationCard(pub, { layout: "detailed" }));
    });

    groupSection.append(heading, grid);
    elements.publicationsPageList.appendChild(groupSection);
  });
}

function renderSkills(profile) {
  if (!elements.skillsList) return;
  setText(elements.skillsIntro, profile.sections?.skills);
  elements.skillsList.innerHTML = "";

  safeArray(profile.skills).forEach((group) => {
    const card = document.createElement("article");
    card.className = "skill-card";

    const title = document.createElement("h3");
    title.className = "skill-card__title";
    title.textContent = group.category;

    const list = document.createElement("ul");
    list.className = "skill-card__items";
    safeArray(group.items).forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });

    card.append(title, list);
    elements.skillsList.appendChild(card);
  });
}

function renderFooter(profile) {
  if (elements.footerNote) {
    const year = new Date().getFullYear();
    const note = profile.footer?.note ?? "Always up for discussions on scientific discovery, generative AI, and applied research.";
    elements.footerNote.textContent = `© ${year} ${profile.name ?? ""}. ${note}`;
  }

  if (elements.footerLinks) {
    elements.footerLinks.innerHTML = "";
    safeArray(profile.social).forEach((item) => {
      if (!item?.label || !item?.url) return;
      const link = document.createElement("a");
      link.href = item.url;
      link.textContent = item.label;
      link.className = "bounce-link";
      link.target = "_blank";
      link.rel = "noopener";
      elements.footerLinks.appendChild(link);
    });
  }
}

function renderPageHero(config) {
  if (!elements.pageHeroTitle && !elements.pageHeroSummary && !elements.pageHeroPretitle) {
    return;
  }

  if (!config) {
    renderActions(elements.pageHeroActions, null);
    return;
  }

  if (config.pretitle !== undefined) {
    setText(elements.pageHeroPretitle, config.pretitle);
  }
  if (config.title !== undefined) {
    setText(elements.pageHeroTitle, config.title);
  }
  if (config.summary !== undefined) {
    setText(elements.pageHeroSummary, config.summary);
  }

  renderActions(elements.pageHeroActions, config.actions);
}

function createProjectCard(project, options = {}) {
  const layout = options.layout ?? "compact";

  if (layout === "detailed") {
    const card = document.createElement("article");
    card.className = "project-card";

    if (project.image) {
      const media = document.createElement("figure");
      media.className = "project-card__media";
      const img = document.createElement("img");
      img.src = project.image;
      img.alt = project.imageAlt ?? `${project.name} illustration`;
      media.appendChild(img);
      card.appendChild(media);
    }

    const body = document.createElement("div");
    body.className = "project-card__body";

    const metaRow = document.createElement("div");
    metaRow.className = "project-card__meta";
    [project.timeline, project.role].filter(Boolean).forEach((meta) => {
      const span = document.createElement("span");
      span.textContent = meta;
      metaRow.appendChild(span);
    });

    const title = document.createElement("h3");
    title.className = "project-card__title";
    title.textContent = project.name;

    body.append(metaRow, title);

    if (project.summary) {
      const summary = document.createElement("p");
      summary.className = "project-card__summary";
      summary.textContent = project.summary;
      body.appendChild(summary);
    }

    if (Array.isArray(project.highlights) && project.highlights.length) {
      const list = document.createElement("ul");
      list.className = "project-card__highlights";
      project.highlights.forEach((highlight) => {
        const li = document.createElement("li");
        li.textContent = highlight;
        list.appendChild(li);
      });
      body.appendChild(list);
    }

    if (Array.isArray(project.tags) && project.tags.length) {
      const tags = document.createElement("div");
      tags.className = "project-card__tags";
      project.tags.forEach((tag) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = tag;
        tags.appendChild(chip);
      });
      body.appendChild(tags);
    }

    if (Array.isArray(project.links) && project.links.length) {
      const linkRow = document.createElement("div");
      linkRow.className = "project-card__links";
      project.links.forEach((link) => {
        if (!link?.label || !link?.url) return;
        const anchor = document.createElement("a");
        anchor.href = link.url;
        anchor.textContent = link.label;
        anchor.className = "bounce-link";
        if (link.external) {
          anchor.target = "_blank";
          anchor.rel = "noopener";
        }
        linkRow.appendChild(anchor);
      });
      body.appendChild(linkRow);
    }

    card.appendChild(body);
    return card;
  }

  const card = document.createElement("article");
  card.className = "card";

  const title = document.createElement("h3");
  title.className = "card__title";
  title.textContent = project.name;

  card.appendChild(title);

  if (project.summary) {
    const subtitle = document.createElement("p");
    subtitle.className = "card__subtitle";
    subtitle.textContent = project.summary;
    card.appendChild(subtitle);
  }

  if (Array.isArray(project.highlights) && project.highlights.length) {
    card.appendChild(createList(project.highlights));
  }

  if (Array.isArray(project.tags) && project.tags.length) {
    const chipRow = document.createElement("div");
    chipRow.className = "chip-row";
    project.tags.forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = tag;
      chipRow.appendChild(chip);
    });
    card.appendChild(chipRow);
  }

  return card;
}

function createPublicationCard(publication, options = {}) {
  const layout = options.layout ?? "compact";
  const card = document.createElement("article");
  card.className = "publication-card";

  const title = document.createElement("h3");
  title.className = "publication-card__title";
  title.textContent = publication.title;

  const meta = document.createElement("p");
  meta.className = "publication-card__meta";
  const metadata = [publication.venue, publication.year, publication.note].filter(Boolean);
  meta.textContent = metadata.join(" · ");

  card.append(title, meta);

  if (layout === "detailed" && Array.isArray(publication.authors) && publication.authors.length) {
    const authors = document.createElement("p");
    authors.className = "publication-card__authors";
    authors.textContent = publication.authors.join(", ");
    card.appendChild(authors);
  }

  if (layout === "detailed" && Array.isArray(publication.tags) && publication.tags.length) {
    const tags = document.createElement("div");
    tags.className = "publication-card__tags";
    publication.tags.forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = tag;
      tags.appendChild(chip);
    });
    card.appendChild(tags);
  }

  if (publication.link) {
    const linkRow = document.createElement("div");
    linkRow.className = "publication-card__links";
    const link = document.createElement("a");
    link.className = "publication-card__link bounce-link";
    link.href = publication.link;
    link.textContent = "View publication";
    link.target = "_blank";
    link.rel = "noopener";
    linkRow.appendChild(link);
    card.appendChild(linkRow);
  }

  return card;
}

function renderActions(container, actions) {
  if (!container) return;
  container.innerHTML = "";
  if (!Array.isArray(actions) || !actions.length) return;

  actions.forEach((action) => {
    if (!action?.label || !action?.url) return;
    const link = document.createElement("a");
    link.href = action.url;
    link.textContent = action.label;
    link.className = action.primary ? "button" : "button button--ghost";
    if (action.external) {
      link.target = "_blank";
      link.rel = "noopener";
    }
    container.appendChild(link);
  });
}

function createList(items) {
  const list = document.createElement("ul");
  list.className = "card__list";
  safeArray(items).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  });
  return list;
}

function getProjectsArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.projects)) return data.projects;
  return [];
}

function getPublicationsArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.publications)) return data.publications;
  return [];
}

function groupPublications(publications) {
  const groups = new Map();
  publications
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    .forEach((pub) => {
      const type = pub.type ?? "Other";
      if (!groups.has(type)) {
        groups.set(type, []);
      }
      groups.get(type).push(pub);
    });

  const sortedTypes = Array.from(groups.keys()).sort((a, b) => {
    const indexA = PUBLICATION_TYPE_ORDER.indexOf(a);
    const indexB = PUBLICATION_TYPE_ORDER.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return sortedTypes.map((type) => ({ type, items: groups.get(type) ?? [] }));
}

function fetchSectionCopy(section) {
  const profile = dataCache.get("data/profile.json");
  return profile?.sections?.[section] ?? "";
}

function fetchPageIntro(page) {
  const profile = dataCache.get("data/profile.json");
  return profile?.pages?.[page]?.intro ?? "";
}

function highlightNavigation(page) {
  document.querySelectorAll(".site-nav [data-nav]").forEach((link) => {
    if (link.dataset.nav === page) {
      link.classList.add("is-active");
    } else {
      link.classList.remove("is-active");
    }
  });
}

function setText(element, value) {
  if (!element) return;
  element.textContent = value ?? "";
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function showLoadError(page) {
  const message =
    "Unable to load profile data right now. If this is a local preview, enable network access or start a quick static server (e.g. `python -m http.server`). If this is on GitHub Pages, confirm that the data files are pushed to the main branch.";

  if (page === "projects") {
    setText(elements.pageHeroSummary, message);
  } else if (page === "publications") {
    setText(elements.pageHeroSummary, message);
  } else {
    setText(elements.heroSummary, message);
  }
}

function buildSources(path) {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const local = cleanPath;
  const remote = `${RAW_BASE_URL}${cleanPath}`;

  if (isGitHubPagesHost) {
    return unique([remote, local]);
  }

  if (isFileProtocol) {
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

function initTheme() {
  const stored = localStorage.getItem("preferred-theme");
  if (stored === "light" || stored === "dark") {
    document.documentElement.setAttribute("data-theme", stored);
    return;
  }
  document.documentElement.setAttribute("data-theme", "light");
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("preferred-theme", next);
}

function attachEventListeners() {
  if (elements.themeToggle) {
    elements.themeToggle.addEventListener("click", toggleTheme);
  }
}
