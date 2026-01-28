const app = document.getElementById("app");
const navLinks = Array.from(document.querySelectorAll(".navbtn"));

const routes = {
  specimen: { file: "0_code/a_partials/00_specimen.html", css: "1_assets/styles/a_partials/00_specimen.css"},
  home:     { file: "0_code/a_partials/01_home.html", css: "1_assets/styles/a_partials/01_home.css"},
  research: { file: "0_code/a_partials/02_research.html", css: "1_assets/styles/a_partials/02_research.css"},
  code:     { file: "0_code/a_partials/template/wip.html", css: "1_assets/styles/a_partials/03_code.css"},
  sitemap:  { file: "0_code/a_partials/template/wip.html", css: "1_assets/styles/a_partials/04_sitemap.css"},
  applications: {file: "0_code/a_partials/05_applicationTracker.html", css: "1_assets/styles/a_partials/05_applicationTracker.css"},
  "person-aaron-jalca": {file: "0_code/people_index/AaronJalca.html", css: null},
  "person-lei-fang": {file: "0_code/people_index/LeiFang.html", css: null},
  "person-salome-baslandze": {file: "0_code/people_index/SalomeBaslandze.html", css: null},
  "person-simon-fuchs": {file: "0_code/people_index/SimonFuchs.html", css: null},
  "person-brent-meyer": {file: "0_code/people_index/BrentMeyer.html", css: null},
  "person-david-wiczer": {file: "0_code/people_index/DavidWiczer.html", css: null},
  "person-kc-pringle": {file: "0_code/people_index/KCPringle.html", css: null},
  "person-melinda-pitts": {file: "0_code/people_index/MelindaPitts.html", css: null}
};

/*
===========================
PUBLICATIONS DATA
===========================
*/
const publications = {
  "meyer2025tariffs": {
    id: "meyer2025tariffs",
    title: "Will Tariffs Touch Off an Inflationary Impulse? Business Execs Think So",
    authors: [
      { name: "B. Meyer", link: "#person-brent-meyer" },
      { name: "A. Jalca", link: "#person-aaron-jalca" },
      { name: "M. Sparks", link: "#" },
      { name: "D. Wiczer", link: "#person-david-wiczer" }
    ],
    venue: "Federal Reserve Bank of Atlanta's <i>Policy Hub</i>",
    date: "Aug. 24, 2025",
    abstract: "Following the inflationary surge from 2021 to 2023, which was touched off by supply chain constraints and shipping bottlenecks, we evaluate a new panel of own-firm price and unit cost growth expectations in the Atlanta Fed's Survey of Business Uncertainty for signs that the anticipated impactfrom tariffs is broadening beyond directlry affectedfirms. We find evidence for the potential of tariffs to touch off another bout of high inflation. First, firms that are directly exposed to tariffs have increased their year-ahead price growth expectations sharply (by 0.7 percentage points). Second, firms that are not directly exposed to tariffs but are operating in industries that are highly exposed to tariffs anticipate a moderately higher trajectory for year-ahead price growth (0.3 percentage points). Third, this broadening of overall price pressures --- a key feature of the pandemi-era inflationary impulse --- is only partially offset by lower price increases from tariff-exposed firms that are operating largely in industries not exposed to tariffs.",
    badges: [
      { text: "Survey Methods", type: "success" },
      { text: "Trade Policy", type: "success" },
      { text: "Firm Behavior", type: "success" }
    ],
    pdf: "2_docs/01_publications/TariffsInflationaryImpulse_No4_2025_FRBATL_PHUB.pdf",
    doi: "https://doi.org/10.29338/ph2025-04",
    citation: `@techreport{meyer2025tariffs,
  title={Will Tariffs Touch Off an Inflationary Impulse? Business Execs Think So},
  author={Meyer, Brent and Jalca, Aaron and Sparks, Michael Dwight and Wiczer, David},
  institution={Federal Reserve Bank of Atlanta},
  series={Policy Hub},
  number={2025-04},
  year={2025},
  month={August},
  doi={10.29338/ph2025-04}
}`,
    press: [
      { name: "CNN", url: "https://www.cnn.com/2025/08/24/economy/us-tariffs-passthrough-consumers" }
    ]
  },
  "baslandze2025tariffs": {
    id: "baslandze2025tariffs",
    title: "Tariffs and Consumer Prices: Insights from Newly Matched Consumption-Trade Micro Data",
    authors: [
      { name: "S. Baslandze", link: "#person-salome-baslandze" },
      { name: "S. Fuchs", link: "#person-simon-fuchs" },
      { name: "KC Pringle", link: "#person-kc-pringle" },
      { name: "M. Sparks", link: "#" }
    ],
    venue: "Federal Reserve Bank of Atlanta's <i>Policy Hub</i>",
    date: "Feb. 28, 2025",
    abstract: "We evaluate the impact of various US tariff scenarios on consumer prices using novel micro-level data linking imports to consumer expenditures. Results indicate that an additional 10 percent tariff on Chinese imports, 25 percent tariff on Canadianand Mexican imports, and 10 percent tariff on other countries could raise consumer prices on everyday retail purchases, such as food and beverage items and general merchandise, covering about a quarter of the total consumption basket, by 81 percent to 1.63 percent, assuming half to full pass-through. Notably, tariffs on Canada and Mexico contribute approximately 45 percent of the total price effect. Our results focus on direct effects of tariffs on a quarter of the total consumption basket, and the aggregate effect on the overall Consumer Price Index (CPI) further hinges on the price sensitivity of the excluded consumption categories, particularly transportation, services, energy, and housing.",
    badges: [
      { text: "Inflation", type: "success" },
      { text: "Trade Policy", type: "success" },
      { text: "Industrial Organization", type: "success" }
    ],
    pdf: "2_docs/01_publications/TariffsAndConsumerPrices_No1_2025_FRBATL_PHUB.pdf",
    doi: "https://doi.org/10.29338/ph2025-01",
    citation: `@techreport{baslandze2025tariffs,
  title={Tariffs and Consumer Prices: Insights from Newly Matched Consumption-Trade Micro Data},
  author={Baslandze, Salome and Fuchs, Simon and Pringle, KC and Sparks, Michael Dwight},
  institution={Federal Reserve Bank of Atlanta},
  series={Policy Hub},
  number={2025-01},
  year={2025},
  month={February},
  doi={10.29338/ph2025-01}
}`,
    press: [
      { name: "AJC", url: "https://www.ajc.com/news/business/tariffs-will-raise-prices-its-just-a-matter-of-how-much-atlanta-fed-says/L3UXK5Z6UVG7DDF46XJOBCDKOA/" },
      { name: "Reuters", url: "https://www.reuters.com/business/trumps-tariff-blitz-prompts-firefighting-response-fed-researchers-2025-05-27/" },
      { name: "CBS", url: "https://www.cbsnews.com/news/trump-tariffs-what-will-cost-more-inflation/" },
      { name: "Bloomberg", url: "https://www.bloomberg.com/news/articles/2025-02-28/fed-paper-finds-tariffs-may-raise-us-consumers-everyday-costs" },
      {name:"",url:"#"},
      { name: "Breitbart", url: "https://www.breitbart.com/economy/2025/03/03/new-fed-research-shows-modest-consumer-price-impact-from-proposed-tariffs/" }
    ]
  },
  "fang2024labor": {
    id: "fang2024labor",
    title: "Labor Supply of Newly Immigrated Workers",
    authors: [
      { name: "L. Fang", link: "#person-lei-fang" },
      { name: "M. Pitts", link: "#person-melinda-pitts" },
      { name: "M. Sparks", link: "#" }
    ],
    venue: "Federal Reserve Bank of Atlanta's <i>Policy Hub: Macroblog</i>",
    date: "Aug. 19, 2024",
    abstract: "How do newly immigrated workers compare to native born workers? This policy blog uses ACS (American Community Survey) data to investigate the potential macroeconomic effects of 2024 CBO (Congressional Budget Office) revisiont of immigration figures. When immigrants first arrive, they lag behind native born workers in Labor Force Participation Rate, Annual Hours worked, and average number of weeks worked. By their fifth year, these immigrants work as much as native workers, and by their 10th year they consistently out-work native born workers across time, and in all three measures.",
    badges: [
      { text: "Employment", type: "success" },
      { text: "Immigration", type: "success" }
    ],
    pdf: null,
    doi: "https://www.atlantafed.org/blogs/macroblog/2024/08/19/labor-supply-of-newly-immigrated-workers",
    citation: `@misc{fang2024labor,
  title={Labor Supply of Newly Immigrated Workers},
  author={Fang, Lei and Pitts, M. and Sparks, Michael Dwight},
  year={2024},
  month={August},
  howpublished={Federal Reserve Bank of Atlanta Macroblog},
  url={https://www.atlantafed.org/blogs/macroblog/2024/08/19/labor-supply-of-newly-immigrated-workers}
}`,
    press: [
      { name: "Breitbart", url: "https://www.breitbart.com/economy/2024/08/20/breitbart-business-digest-natives-work-more-intensively-than-immigrants/" }
    ]
  }
};

function setActive(page){
  navLinks.forEach(a => {
    a.classList.toggle("active", a.dataset.page === page);
  });
}

function ensurePageCSS(href){
  // Remove any prior page-only stylesheet
  document.querySelectorAll("link[data-page-css]").forEach(el => el.remove());

  if (!href) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.setAttribute("data-page-css", "true");
  document.head.appendChild(link);
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
Research Card Rendering
===========================
*/

let cardTemplate = null;

async function loadCardTemplate() {
  if (!cardTemplate) {
    const res = await fetch("0_code/a_partials/template/research_card.html", { cache: "no-store" });
    cardTemplate = await res.text();
  }
  return cardTemplate;
}

function renderCard(pubId) {
  const pub = publications[pubId];
  if (!pub) return '';

  const template = document.createElement('div');
  template.innerHTML = cardTemplate;
  const card = template.querySelector('.card');

  // Populate fields
  card.querySelector('[data-field="title"]').textContent = pub.title;

  // Authors
  const authorsHTML = pub.authors.map(author =>
    `<a href="${author.link}" class="name-link">${author.name}</a>`
  ).join(', ');
  card.querySelector('[data-field="authors"]').innerHTML = authorsHTML;

  card.querySelector('[data-field="venue"]').innerHTML = pub.venue;
  card.querySelector('[data-field="date"]').textContent = pub.date;
  card.querySelector('[data-field="abstract"]').textContent = pub.abstract;

  // Badges
  const badgesContainer = card.querySelector('[data-field="badges"]');
  badgesContainer.innerHTML = pub.badges.map(badge =>
    `<span class="badge badge--${badge.type}">${badge.text}</span>`
  ).join('');

  // Buttons
  const buttonsContainer = card.querySelector('[data-field="buttons"]');
  let buttonsHTML = '';
  if (pub.pdf) {
    buttonsHTML += `<a href="${pub.pdf}" target="_blank" class="btn btn--primary">View PDF</a>`;
  }
  buttonsHTML += `<a href="${pub.doi}" target="_blank" class="btn btn--ghost">DOI Link</a>`;
  buttonsHTML += `<button class="btn btn--ghost cite-btn" data-citation="${pub.citation.replace(/"/g, '&quot;')}">Cite</button>`;
  buttonsContainer.innerHTML = buttonsHTML;

  // Press links
  const pressContainer = card.querySelector('[data-field="press-links"]');
  if (pub.press && pub.press.length > 0) {
    if (pub.press.length === 1) {
      // Single press link - simple layout
      pressContainer.style.display = 'block';
      pressContainer.style.fontFamily = 'var(--font-mono)';
      pressContainer.style.fontSize = 'var(--font-xs)';
      pressContainer.innerHTML = `<a href="${pub.press[0].url}" target="_blank">${pub.press[0].name}</a>`;
    } else {
      // Multiple press links - grid layout
      pressContainer.innerHTML = pub.press.map(press =>
        `<a href="${press.url}" target="_blank">${press.name}</a>`
      ).join('') + (pub.press.length === 5 ? '<span></span>' : '');
    }
  } else {
    pressContainer.remove();
  }

  // Adjust footer layout based on press links
  const footerContainer = card.querySelector('[data-field="footer-container"]');
  if (!pub.press || pub.press.length <= 1) {
    // Simple layout for no press or single press link
    footerContainer.style.display = 'flex';
    footerContainer.style.justifyContent = 'space-between';
    footerContainer.style.alignItems = 'center';
    footerContainer.style.gap = '8px';
  }

  return card.outerHTML;
}

async function renderCards(pubIds, containerId) {
  await loadCardTemplate();
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = pubIds.map(id => renderCard(id)).join('');
    setupCitationCopyListeners();
  }
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

async function loadPage(page){
  const route = routes[page] || routes.home;

  setActive(page in routes ? page : "home");
  ensurePageCSS(route.css);

  const res = await fetch(route.file, { cache: "no-store" });
  app.innerHTML = await res.text();

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
