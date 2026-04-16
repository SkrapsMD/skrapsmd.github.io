const app = document.getElementById("app");
const navLinks = Array.from(document.querySelectorAll(".navbtn"));
const menuToggle = document.getElementById("menu-toggle");
const navbars = document.querySelector(".navbars");

// Mobile menu toggle
if (menuToggle && navbars) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navbars.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", isOpen);
  });

  // Close menu when navigating
  navLinks.forEach(link => {
    link.addEventListener("click", () => {
      navbars.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const routes = {
  specimen: { file: "0_code/a_partials/00_specimen.html", css: "1_assets/styles/a_partials/00_specimen.css"},
  home:     { file: "0_code/a_partials/01_home.html", css: "1_assets/styles/a_partials/01_home.css"},
  research: { file: "0_code/a_partials/02_research.html", css: "1_assets/styles/a_partials/02_research.css"},
  code:     { file: "0_code/a_partials/template/wip.html", css: "1_assets/styles/a_partials/03_code.css"},
  sitemap:  { file: "0_code/a_partials/template/wip.html", css: "1_assets/styles/a_partials/04_sitemap.css"},
  applications: {file: "0_code/a_partials/05_applicationTracker.html", css: "1_assets/styles/a_partials/05_applicationTracker.css"},
  people:   { file: "0_code/a_partials/06_people.html", css: "1_assets/styles/a_partials/06_people.css"},
  "person-aaron-jalca": {file: "0_code/people_index/AaronJalca.html", css: null},
  "person-lei-fang": {file: "0_code/people_index/LeiFang.html", css: null},
  "person-salome-baslandze": {file: "0_code/people_index/SalomeBaslandze.html", css: null},
  "person-simon-fuchs": {file: "0_code/people_index/SimonFuchs.html", css: null},
  "person-brent-meyer": {file: "0_code/people_index/BrentMeyer.html", css: null},
  "person-david-wiczer": {file: "0_code/people_index/DavidWiczer.html", css: null},
  "person-kc-pringle": {file: "0_code/people_index/KCPringle.html", css: null},
  "person-melinda-pitts": {file: "0_code/people_index/MelindaPitts.html", css: null},
  "person-john-hermann": {file: "0_code/people_index/JohnHermann.html", css: null},
  "person-rik-chakraborti": {file: "0_code/people_index/RikChakraborti.html", css: null},
  "person-iordanka-panyatova": {file: "0_code/people_index/IordankaPanyatova.html", css: null},
  "person-jon-white": {file: "0_code/people_index/JonWhite.html", css: null},
  "person-frank-garmon": {file: "0_code/people_index/FrankGarmon.html", css: null},
  "person-zachary-edwards": {file: "0_code/people_index/ZacharyEdwards.html", css: null},
  "person-john-graham": {file: "0_code/people_index/JohnGraham.html", css: null},
  "person-ty-mcclure": {file: "0_code/people_index/TyMcClure.html", css: null},
  "person-sonya-waddell": {file: "0_code/people_index/SonyaWaddell.html", css: null},
  "person-daniel-weitz": {file: "0_code/people_index/DanielWeitz.html", css: null}
};

// In-memory caches for instant navigation
const htmlCache = new Map();
const cssCache = new Set();
let peopleDirectoryCache = null;

/*
===========================
PUBLICATIONS DATA - DEPRECATED
===========================
Publications are now stored as individual HTML files in 0_code/research_cards/
This improves performance by:
1. Eliminating JavaScript data object parsing
2. Reducing main JS file size
3. Allowing parallel card loading
4. Enabling easier content updates without touching code
*/

function setActive(page){
  navLinks.forEach(a => {
    a.classList.toggle("active", a.dataset.page === page);
  });
}

function ensurePageCSS(href){
  // Remove old page-specific CSS to prevent bloat
  document.querySelectorAll('link[data-page-css="true"]').forEach(link => {
    link.remove();
  });

  // If no CSS needed for this page, we're done
  if (!href) return;

  // Check if this exact CSS is already properly loaded with the right attribute
  const existingLink = document.querySelector(`link[href="${href}"][data-page-css="true"]`);
  if (existingLink) return;

  // Remove any stale versions without the attribute (from prefetch, etc)
  document.querySelectorAll(`link[href="${href}"]`).forEach(link => {
    link.remove();
  });

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.setAttribute("data-page-css", "true");
  document.head.appendChild(link);
  cssCache.add(href);
}

function currentPage(){
  const hash = location.hash.replace("#", "");
  return hash || "home";
}




/*
===========================
0_Specimen.html Functions
===========================
*/

// Function 1: Copy color hex to clipboard on click
// Copy color hex to clipboard on click
function setupColorCopyListeners() {
  document.querySelectorAll('[data-color]').forEach(el => {
    el.style.cursor = 'pointer';
    el.title = 'Click to copy hex code';

    el.addEventListener('click', async () => {
      const color = el.dataset.color;
      try {
        await navigator.clipboard.writeText(color);

        // Visual feedback
        const originalContent = el.innerHTML;
        el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:white;text-shadow:1px 1px 2px black;font-weight:600;font-size:12px;">Copied!</div>`;

        setTimeout(() => {
          el.innerHTML = originalContent;
        }, 800);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    });
  });
}

/*
===========================
Research Card Loading
===========================
*/

// Load research card HTML files and inject them into a container
async function loadResearchCards(cardIds, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    // Fetch all card HTML files in parallel
    const cardPromises = cardIds.map(id => 
      fetch(`0_code/research_cards/${id}.html`).then(res => res.text())
    );
    
    const cardHTMLs = await Promise.all(cardPromises);
    container.innerHTML = cardHTMLs.join('');
    
    // Setup citation copy listeners after cards are loaded
    setupCitationCopyListeners();

    // Setup story modal after cards are injected
    setupStoryModal();
  } catch (error) {
    console.error('Error loading research cards:', error);
  }
}

// Legacy function name for backwards compatibility
async function renderCards(cardIds, containerId) {
  await loadResearchCards(cardIds, containerId);
}

/*
===========================
02_Research.html Functions
===========================
*/

// Copy citation to clipboard on click
function setupCitationCopyListeners() {
  document.querySelectorAll('.cite-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const citation = btn.dataset.citation;
      try {
        await navigator.clipboard.writeText(citation);

        // Visual feedback
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';

        setTimeout(() => {
          btn.textContent = originalText;
        }, 1500);
      } catch (err) {
        console.error('Failed to copy citation:', err);
      }
    });
  });
}

/*
===========================
Story Modal (Flourish Data Stories)
===========================
*/

// Optional grouped stories: used when editors provide one iframe per figure.
const STORY_GROUPS = {
  baslandze2026ai: [
    { label: 'Figure 1', src: 'https://flo.uri.sh/visualisation/27989265/embed', height: 500 },
    { label: 'Figure 2', src: 'https://flo.uri.sh/visualisation/27989925/embed', height: 500 },
    { label: 'Figure 3', src: 'https://flo.uri.sh/visualisation/27990103/embed', height: 500 },
    { label: 'Figure 4', src: 'https://flo.uri.sh/visualisation/27990889/embed', height: 500 },
    { label: 'Figure 5', src: 'https://flo.uri.sh/visualisation/27991692/embed', height: 500 },
    { label: 'Figure 6', src: 'https://flo.uri.sh/visualisation/28006570/embed', height: 500 },
    { label: 'Figure 7', src: 'https://flo.uri.sh/visualisation/28012838/embed', height: 550 },
    { label: 'Figure 8', src: 'https://flo.uri.sh/visualisation/28031289/embed', height: 700 }
  ]
};

function buildStoryEmbedUrl(storySrc) {
  if (!storySrc) return '';

  // Supports both full iframe URLs and legacy short Flourish paths like story/12345?
  if (/^https?:\/\//i.test(storySrc)) {
    return storySrc;
  }

  const basePath = storySrc.split('?')[0];
  return 'https://flo.uri.sh/' + basePath + '/embed';
}

function createStoryIframe(storySrc, height) {
  const iframe = document.createElement('iframe');
  iframe.src = buildStoryEmbedUrl(storySrc);
  iframe.title = 'Interactive or visual content';
  iframe.className = 'flourish-embed-iframe';
  iframe.frameBorder = '0';
  iframe.scrolling = 'no';
  iframe.style.width = '100%';
  iframe.style.height = (height || 600) + 'px';
  iframe.setAttribute('sandbox', 'allow-same-origin allow-forms allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation');
  return iframe;
}

function showStorySequence(stories, title) {
  const modal = document.getElementById('story-modal');
  if (!modal || !Array.isArray(stories) || stories.length === 0) return;

  const titleEl = modal.querySelector('.story-modal-title');
  const container = modal.querySelector('.story-embed-container');

  let currentIndex = 0;

  const renderCurrentFigure = () => {
    const current = stories[currentIndex];
    if (!current) return;

    container.innerHTML = '';

    if (stories.length > 1) {
      const nav = document.createElement('div');
      nav.className = 'story-nav';

      const prevBtn = document.createElement('button');
      prevBtn.className = 'btn btn--ghost';
      prevBtn.textContent = 'Previous';
      prevBtn.disabled = currentIndex === 0;

      const indicator = document.createElement('div');
      indicator.className = 'story-nav-indicator';
      indicator.textContent = (current.label || ('Figure ' + (currentIndex + 1))) + ' (' + (currentIndex + 1) + '/' + stories.length + ')';

      const nextBtn = document.createElement('button');
      nextBtn.className = 'btn btn--ghost';
      nextBtn.textContent = 'Next';
      nextBtn.disabled = currentIndex === stories.length - 1;

      prevBtn.addEventListener('click', () => {
        if (currentIndex === 0) return;
        currentIndex -= 1;
        renderCurrentFigure();
      });

      nextBtn.addEventListener('click', () => {
        if (currentIndex >= stories.length - 1) return;
        currentIndex += 1;
        renderCurrentFigure();
      });

      nav.appendChild(prevBtn);
      nav.appendChild(indicator);
      nav.appendChild(nextBtn);
      container.appendChild(nav);
    }

    container.appendChild(createStoryIframe(current.src, current.height));

    if (titleEl) {
      const figureLabel = current.label ? ' - ' + current.label : '';
      titleEl.textContent = (title || '') + figureLabel;
    }
  };

  renderCurrentFigure();
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

// Abstracted display function — swap internals to change presentation
function showStory(storySrc, title) {
  showStorySequence([{ src: storySrc, label: '', height: 600 }], title);
}

function showStoryGroup(groupKey, title) {
  const stories = STORY_GROUPS[groupKey];
  if (!stories || stories.length === 0) return;
  showStorySequence(stories, title);
}

// Setup story modal triggers and close handlers
function setupStoryModal() {
  const modal = document.getElementById('story-modal');
  if (!modal) return;

  const closeBtn = modal.querySelector('.story-modal-close');
  const overlay = modal.querySelector('.story-modal-overlay');
  const container = modal.querySelector('.story-embed-container');

  // Attach click handlers to dedicated story buttons
  document.querySelectorAll('.story-btn[data-story-src], .story-btn[data-story-group]').forEach(btn => {
    if (btn.dataset.storyBound === 'true') return;

    const storySrc = btn.dataset.storySrc;
    const storyGroup = btn.dataset.storyGroup;
    const card = btn.closest('.card');
    if (!card) return;

    const titleEl = card.querySelector('.card-title');
    const title = titleEl ? titleEl.textContent.trim() : '';

    const openStory = () => {
      if (storyGroup) {
        showStoryGroup(storyGroup, title);
        return;
      }
      if (storySrc) {
        showStory(storySrc, title);
      }
    };

    // Add modifier class and wrap card once
    if (!card.classList.contains('card--has-story')) {
      card.classList.add('card--has-story');

      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'card-content';
      while (card.firstChild) {
        contentWrapper.appendChild(card.firstChild);
      }

      const sidebar = document.createElement('div');
      sidebar.className = 'card-sidebar';
      sidebar.setAttribute('role', 'button');
      sidebar.setAttribute('aria-label', 'Open data story: ' + title);
      sidebar.setAttribute('tabindex', '0');

      card.appendChild(sidebar);
      card.appendChild(contentWrapper);
    }

    const sidebar = card.querySelector('.card-sidebar');
    if (!sidebar) return;

    // Click handler
    if (sidebar.dataset.storyBound !== 'true') {
      sidebar.addEventListener('click', openStory);

      // Keyboard: Enter/Space
      sidebar.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openStory();
        }
      });
      sidebar.dataset.storyBound = 'true';
    }

    // Keep button handler as mobile fallback
    btn.addEventListener('click', openStory);
    btn.dataset.storyBound = 'true';

    // Touch swipe-to-open on mobile
    if (card.dataset.storySwipeBound !== 'true') {
      let touchStartX = 0;
      let touchStartY = 0;

      card.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      card.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);

        // Swipe right: horizontal distance > 50px, vertical drift < 30px
        if (dx > 50 && dy < 30) {
          card.classList.add('card--swiped');
          setTimeout(() => {
            openStory();
            card.classList.remove('card--swiped');
          }, 300);
        }
      });

      card.dataset.storySwipeBound = 'true';
    }
  });

  // Close modal handler
  const closeModal = () => {
    modal.classList.remove('open');
    container.innerHTML = '';
    document.body.style.overflow = '';
  };

  if (modal.dataset.modalBound !== 'true') {
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) {
        closeModal();
      }
    });

    modal.dataset.modalBound = 'true';
  }
}

/*
===========================
People Index Functions
===========================
*/

function parseCSVLine(line) {
  const out = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      out.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  out.push(current.trim());
  return out;
}

async function loadPeopleDirectory() {
  if (peopleDirectoryCache) return peopleDirectoryCache;

  try {
    const res = await fetch('0_code/people_index/people_directory.csv', { cache: 'default' });
    const text = await res.text();
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    if (lines.length < 2) {
      peopleDirectoryCache = [];
      return peopleDirectoryCache;
    }

    const headers = parseCSVLine(lines[0]);
    const records = lines.slice(1).map(line => {
      const values = parseCSVLine(line);
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      return row;
    });

    peopleDirectoryCache = records;
    return records;
  } catch (error) {
    console.error('Error loading people directory CSV:', error);
    peopleDirectoryCache = [];
    return peopleDirectoryCache;
  }
}

function findPersonTableRow(tbody, label) {
  return Array.from(tbody.querySelectorAll('tr')).find(tr => {
    const th = tr.querySelector('th');
    if (!th) return false;
    return th.textContent.trim().toLowerCase() === label.toLowerCase();
  });
}

function ensurePersonTableRow(tbody, label) {
  let row = findPersonTableRow(tbody, label);
  if (row) return row;

  row = document.createElement('tr');
  const th = document.createElement('th');
  th.setAttribute('scope', 'row');
  th.textContent = label;

  const td = document.createElement('td');
  row.appendChild(th);
  row.appendChild(td);

  const updatedRow = findPersonTableRow(tbody, 'Updated');
  if (updatedRow) {
    tbody.insertBefore(row, updatedRow);
  } else {
    tbody.appendChild(row);
  }

  return row;
}

function setRowText(tbody, label, value, mono) {
  const row = ensurePersonTableRow(tbody, label);
  const td = row.querySelector('td');
  if (!td) return;
  td.textContent = value || '-';
  td.classList.toggle('mono', !!mono);
}

function setOptionalRowText(tbody, label, value, mono) {
  const hasValue = !!(value && String(value).trim());
  const existing = findPersonTableRow(tbody, label);

  if (!hasValue) {
    if (existing) existing.remove();
    return;
  }

  setRowText(tbody, label, value, mono);
}

function formatTodayForUpdatedLabel() {
  const now = new Date();
  const monthMap = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
  const month = monthMap[now.getMonth()] || '';
  return month + ' ' + now.getDate() + ', ' + now.getFullYear();
}

function setRowLastUpdated(tbody, value) {
  // Reuse legacy "Updated" rows when present and standardize label text.
  const existing = findPersonTableRow(tbody, 'Last Updated') || findPersonTableRow(tbody, 'Updated');
  const row = existing || ensurePersonTableRow(tbody, 'Last Updated');

  const th = row.querySelector('th');
  const td = row.querySelector('td');
  if (!th || !td) return;

  th.textContent = 'Last Updated';
  td.textContent = value || formatTodayForUpdatedLabel();
  td.classList.add('mono');
}

function setRowEmail(tbody, value) {
  const row = ensurePersonTableRow(tbody, 'Email');
  const td = row.querySelector('td');
  if (!td) return;

  td.classList.remove('mono');
  td.innerHTML = '';

  if (!value) {
    td.textContent = '-';
    return;
  }

  const link = document.createElement('a');
  link.href = 'mailto:' + value;
  link.style.color = 'var(--text-emph)';
  link.textContent = value;
  td.appendChild(link);
}

function setRowWebsite(tbody, value) {
  const row = ensurePersonTableRow(tbody, 'Website');
  const td = row.querySelector('td');
  if (!td) return;

  td.classList.remove('mono');
  td.innerHTML = '';

  if (!value) {
    td.textContent = '-';
    return;
  }

  const link = document.createElement('a');
  link.href = value;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.style.color = 'var(--text-emph)';
  link.textContent = 'Personal Website';
  td.appendChild(link);
}

async function renderPeopleIndex() {
  const root = document.getElementById('people-index-root');
  if (!root) return;

  const people = await loadPeopleDirectory();
  if (!Array.isArray(people) || people.length === 0) {
    root.innerHTML = '<p>No people data found.</p>';
    return;
  }

  const cnuBundleInstitutions = new Set([
    'Christopher Newport University',
    'George Mason University'
  ]);

  const grouped = new Map([
    ['Federal Reserve Bank of Atlanta', []],
    ['Christopher Newport University', []]
  ]);

  people.forEach(person => {
    const institution = person.institution || '';
    const bundle = cnuBundleInstitutions.has(institution)
      ? 'Christopher Newport University'
      : 'Federal Reserve Bank of Atlanta';
    grouped.get(bundle).push(person);
  });

  const getLastNameSortKey = (person) => {
    const fullName = (person.name || person.index_name || '').trim();
    if (!fullName) return '';

    // Use the final token as last-name sort key.
    const tokens = fullName.replace(',', '').split(/\s+/).filter(Boolean);
    return (tokens[tokens.length - 1] || fullName).toLowerCase();
  };

  const sections = [];
  grouped.forEach((members, institution) => {
    if (!members || members.length === 0) return;

    const sortedMembers = [...members].sort((a, b) => {
      const keyA = getLastNameSortKey(a);
      const keyB = getLastNameSortKey(b);
      if (keyA === keyB) {
        const nameA = (a.name || a.index_name || '').toLowerCase();
        const nameB = (b.name || b.index_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return keyA.localeCompare(keyB);
    });

    const cards = sortedMembers.map(person => {
      const name = person.index_name || person.name || '';
      const image = person.drawing_image || '';
      const slug = person.slug || '';
      const affiliation = person.institution || institution;
      const alt = (name || 'Person') + ' Drawing';

      return `
    <a href="#person-${slug}" class="people-card">
      <img src="${image}" alt="${alt}" class="people-card__image" style="max-width:150px;">
      <div class="people-card__info">
        <div class="people-card__name">${name}</div>
        <div class="people-card__affiliation">${affiliation}</div>
      </div>
    </a>`;
    }).join('');

    sections.push(`
  <div class="table-caption table-caption--lg">
    <span class="table-caption__category">PEOPLE INDEX</span> | <span class="table-caption__title">${institution}</span>
  </div>
  <div class="people-grid">${cards}
  </div>`);
  });

  root.innerHTML = sections.join('\n');
}

async function hydratePersonPageFromDirectory() {
  const page = currentPage();
  if (!page.startsWith('person-')) return;

  const slug = page.replace('person-', '');
  const people = await loadPeopleDirectory();
  const person = people.find(p => p.slug === slug);
  if (!person) return;

  const titleEl = document.querySelector('.table-caption__title');
  if (titleEl && person.name) {
    titleEl.textContent = person.name;
  }

  const img = document.querySelector('.person-photo');
  if (img) {
    if (person.drawing_image) img.src = person.drawing_image;
    if (person.drawing_image) img.dataset.img1 = person.drawing_image;
    if (person.photo_image) img.dataset.img2 = person.photo_image;
    if (person.alt_drawing) img.dataset.alt1 = person.alt_drawing;
    if (person.alt_photo) img.dataset.alt2 = person.alt_photo;
    if (person.alt_drawing) img.alt = person.alt_drawing;
  }

  const tbody = document.querySelector('.table.table--compact tbody');
  if (!tbody) return;

  const profileTable = tbody.closest('table');
  if (profileTable) {
    profileTable.classList.add('person-profile-table');
  }

  setRowText(tbody, 'Name', person.name, false);
  setRowText(tbody, 'Institution', person.institution, false);
  setOptionalRowText(tbody, 'PhD Institution', person.phd_institution, false);
  setRowEmail(tbody, person.email);
  setRowWebsite(tbody, person.website);
  setRowLastUpdated(tbody, person.last_updated || person.updated);
}

// Toggle between two photos on click
function setupPersonPhotoToggle() {
  document.querySelectorAll('.person-photo').forEach(img => {
    img.addEventListener('click', () => {
      const img1 = img.dataset.img1;
      const img2 = img.dataset.img2;
      const alt1 = img.dataset.alt1;
      const alt2 = img.dataset.alt2;
      const currentSrc = img.src.split('/').pop();

      // Toggle between the two images and alt texts
      if (currentSrc === img1.split('/').pop()) {
        img.src = img2;
        img.alt = alt2;
      } else {
        img.src = img1;
        img.alt = alt1;
      }
    });
  });
}

/*
===========================
05_applicationTracker.html Functions - Proof Modal
===========================
*/

function setupProofModal() {
  const modal = document.getElementById('proof-modal');
  if (!modal) return;

  const closeBtn = modal.querySelector('.proof-modal-close');
  const overlay = modal.querySelector('.proof-modal-overlay');
  const fromEl = modal.querySelector('.proof-from');
  const dateEl = modal.querySelector('.proof-date');
  const subjectEl = modal.querySelector('.proof-subject');
  const bodyEl = modal.querySelector('.proof-body');
  const pdfContainer = modal.querySelector('.proof-pdf-container');
  const pdfViewer = modal.querySelector('.proof-pdf-viewer');

  // Handle proof button clicks
  document.querySelectorAll('.proof-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();

      // Get data from parent td element
      const td = btn.closest('td');
      if (!td) return;

      const proofPdf = td.dataset.proofPdf;
      const proofFrom = td.dataset.proofFrom;
      const proofDate = td.dataset.proofDate;
      const proofSubject = td.dataset.proofSubject;
      const proofBody = td.dataset.proofBody;

      // Check if this is a PDF or email proof
      if (proofPdf) {
        // Display PDF mode
        modal.classList.add('pdf-mode');
        pdfContainer.classList.add('active');
        // Add URL parameters to hide PDF toolbar and navigation pane
        pdfViewer.src = proofPdf + '#toolbar=0&navpanes=0&scrollbar=1';

        // Optionally show date in header for PDFs
        if (proofDate) {
          dateEl.textContent = proofDate;
          fromEl.textContent = 'Document Proof';
        }
      } else if (proofFrom && proofDate && proofSubject && proofBody) {
        // Display email mode
        modal.classList.remove('pdf-mode');
        pdfContainer.classList.remove('active');
        pdfViewer.src = '';

        fromEl.textContent = `From: ${proofFrom}`;
        dateEl.textContent = proofDate;
        subjectEl.textContent = `Subject: ${proofSubject}`;
        bodyEl.innerHTML = proofBody; // Use innerHTML to render links
      } else {
        return; // No valid proof data
      }

      modal.classList.add('open');
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    });
  });

  // Close modal handlers
  const closeModal = () => {
    modal.classList.remove('open');
    modal.classList.remove('pdf-mode');
    pdfContainer.classList.remove('active');
    pdfViewer.src = ''; // Clear PDF to stop loading
    document.body.style.overflow = ''; // Restore scroll
  };

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  if (overlay) {
    overlay.addEventListener('click', closeModal);
  }

  // Close with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeModal();
    }
  });
}

// Prefetch page HTML and CSS on hover for instant navigation
function prefetchPage(page) {
  const route = routes[page];
  if (!route) return;

  // Prefetch HTML if not cached
  if (!htmlCache.has(route.file)) {
    fetch(route.file, { cache: "default" })
      .then(res => res.text())
      .then(html => htmlCache.set(route.file, html))
      .catch(() => {}); // Silent fail
  }

  // Prefetch CSS if exists
  if (route.css && !cssCache.has(route.css)) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'style';
    link.href = route.css;
    document.head.appendChild(link);
    cssCache.add(route.css);
  }
}

async function loadPage(page){
  const route = routes[page] || routes.home;

  setActive(page in routes ? page : "home");

  // Check cache first for instant navigation
  let html = htmlCache.get(route.file);
  if (!html) {
    const res = await fetch(route.file, { cache: "default" });
    html = await res.text();
    htmlCache.set(route.file, html);
  }

  // Inject new content first, THEN swap CSS to prevent flash of unstyled content
  app.innerHTML = html;
  ensurePageCSS(route.css);

  // Execute any inline scripts in the loaded content
  const scripts = app.querySelectorAll('script');
  scripts.forEach(script => {
    const newScript = document.createElement('script');
    newScript.textContent = script.textContent;
    script.parentNode.replaceChild(newScript, script);
  });

  // Setup color copy listeners after content is loaded
  setupColorCopyListeners();

  // Setup citation copy listeners after content is loaded
  setupCitationCopyListeners();

  // CSV-driven people index and person profile hydration
  await renderPeopleIndex();
  await hydratePersonPageFromDirectory();

  // Setup person photo toggle after content is loaded
  setupPersonPhotoToggle();

  // Setup story modal for research data stories
  setupStoryModal();

  // Setup proof modal for application tracker
  setupProofModal();
}

window.addEventListener("hashchange", () => loadPage(currentPage()));
loadPage(currentPage());

// Setup prefetching on navigation hover for instant clicks
document.querySelectorAll('.navbtn').forEach(link => {
  link.addEventListener('mouseenter', () => {
    const hash = link.getAttribute('href')?.replace('#', '');
    if (hash && routes[hash]) {
      prefetchPage(hash);
    }
  });
});

// Prefetch likely next pages during browser idle time
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    const currentPageName = currentPage();
    // Prefetch common navigation paths
    const likelyNext = ['home', 'research', 'code'];
    likelyNext.forEach(page => {
      if (page !== currentPageName) {
        prefetchPage(page);
      }
    });
  });
}
