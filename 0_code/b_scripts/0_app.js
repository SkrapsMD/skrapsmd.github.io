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
  "person-frank-garmon": {file: "0_code/people_index/FrankGarmon.html", css: null}
};

// In-memory caches for instant navigation
const htmlCache = new Map();
const cssCache = new Set();

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
People Index Functions
===========================
*/

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

  // Setup person photo toggle after content is loaded
  setupPersonPhotoToggle();
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
