const app = document.getElementById("app");
const navLinks = Array.from(document.querySelectorAll(".nav-link"));

const routes = {
  specimen: { file: "0_code/a_partials/00_specimen.html", css: "1_assets/styles/a_partials/00_specimen.css"},
  home:     { file: "0_code/a_partials/template/wip.html", css: "1_assets/styles/a_partials/01_home.css"},
  research: { file: "0_code/a_partials/template/wip.html", css: "1_assets/styles/a_partials/02_research.css"},
  code:     { file: "0_code/a_partials/template/wip.html", css: "1_assets/styles/a_partials/03_code.css"},
  sitemap:  { file: "0_code/a_partials/template/wip.html", css: "1_assets/styles/a_partials/04_sitemap.css"},
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

async function loadPage(page){
  const route = routes[page] || routes.home;

  setActive(page in routes ? page : "home");
  ensurePageCSS(route.css);

  const res = await fetch(route.file, { cache: "no-store" });
  app.innerHTML = await res.text();
}

function currentPage(){
  const hash = location.hash.replace("#", "");
  return hash || "home";
}

window.addEventListener("hashchange", () => loadPage(currentPage()));
loadPage(currentPage());
