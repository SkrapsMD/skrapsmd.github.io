/* Post office explorer.
   Vanilla JS + inline SVG: the page is opened straight from disk, so it can load
   no library and cannot fetch() its own data — both bundles arrive as globals. */

(function () {
"use strict";

const D = window.PO_DATA, G = window.PO_GEO;

/* The railroad bundle is optional: without data/rail.js the page drops its second
   tab rather than failing to start. The county bundles are optional in the same
   way, and both halves have to be present for the third tab to mean anything —
   measures with no outlines to paint them on would render an empty map. */
const R = window.PO_RAIL || null;
const CD = window.PO_COUNTY || null, CG = window.PO_CGEO || null;
const HAS_COUNTY = !!(CD && CG);

/* The voting bundle rides on the county tab's outlines rather than shipping a
   second copy, so it needs the county bundle present *and* keyed identically —
   k_vote_web emits the same fips in the same order as PO_CGEO. If that ever
   drifts, every county would be painted with its neighbour's vote, which is worse
   than not drawing the tab at all: so the orders are compared, and a mismatch
   drops the tab and says why. */
/* The booktabs fragments in output/tabs/, parsed by l_web_tables. Optional in the
   same way as the rest: without data/tables.js the page simply has no table cards.
   These are the printed tables verbatim, not a second computation of them — the
   point is that a result cannot exist in the paper and be missing from the site. */
const TB = window.PO_TABLES || null;

const VT = window.PO_VOTES || null;
const HAS_VOTES = (() => {
  if (!VT || !HAS_COUNTY) return false;
  const a = VT.counties.fips, b = CG.fips;
  if (a.length !== b.length || a.some((f, i) => f !== b[i])) {
    console.warn("PO_VOTES county order does not match PO_CGEO — voting tab hidden. " +
                 "Rebuild with code/k_vote_web.py after code/h_county_web.py.");
    return false;
  }
  return true;
})();

/* --- Palette ---------------------------------------------------------------
   Every colour on this page, the two data ramps included, is declared in
   app.css, so the stylesheet is the single source of truth and the whole page
   follows the reader's OS theme through light-dark().

   Reading them back needs a detour. A custom property computes to a raw token
   stream, so getComputedStyle(root).getPropertyValue("--c1") hands back the
   literal text "light-dark(...)" rather than a colour. Assigning it to a real
   property and reading that back does resolve it, so the values are pulled off
   a hidden probe's `color`, which comes out as a used rgb() string that SVG
   fill/stroke attributes take verbatim. */

const probe = document.createElement("span");
probe.style.display = "none";
document.body.appendChild(probe);

function tok(name) {
  probe.style.color = `var(${name})`;
  return getComputedStyle(probe).color;
}

let C1, C2, FG, INK2, INK3, BG, MISSING, SEQ, DIV,
    COV_ALL, COV_OFF, COV_NONE, PIN_ROW, CNONE;

function readTokens() {
  C1 = tok("--c1");
  C2 = tok("--c2");
  FG = tok("--fg");
  INK2 = tok("--ink-2");
  INK3 = tok("--ink-3");
  BG = tok("--bg");
  MISSING = tok("--missing");
  SEQ = [1, 2, 3, 4, 5].map(i => tok(`--po-seq-${i}`));
  DIV = [1, 2, 3, 4, 5].map(i => tok(`--po-div-${i}`));
  COV_ALL = tok("--po-cov-all");
  COV_OFF = tok("--po-cov-off");
  COV_NONE = tok("--po-cov-none");
  PIN_ROW = tok("--po-pin-row");
  CNONE = tok("--po-county-none");
}

/* --- Indexes --------------------------------------------------------------- */

const YEARS = D.years, NY = YEARS.length, NO = D.offices.id.length, NR = D.panel.o.length;
const VARS = D.vars, VAR = new Map(VARS.map(v => [v.key, v]));

const rowsByYear = Array.from({ length: NY }, () => []);
const rowsByOffice = Array.from({ length: NO }, () => []);
for (let r = 0; r < NR; r++) {
  rowsByYear[D.panel.y[r]].push(r);
  rowsByOffice[D.panel.o[r]].push(r);
}

const STATES = Array.from(new Set(D.offices.state)).sort();

const S = {
  tab: "explorer",
  yi: YEARS.indexOf(1900) >= 0 ? YEARS.indexOf(1900) : 0,
  size: "Receipts",
  color: "Percent",
  state: "",
  hideMissing: false,
  pin: null,
  sx: "Receipts", sy: "Cost", sxLog: true, syLog: true,
  sortCol: null, sortDir: -1,
  search: "",
  playing: false,
};

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* --- Numbers --------------------------------------------------------------- */

function fmtValue(v, fmt) {
  if (v == null || !isFinite(v)) return "—";
  if (fmt === "money") return "$" + Math.round(v).toLocaleString("en-US");
  if (fmt === "int") return Math.round(v).toLocaleString("en-US");
  if (fmt === "pct") return (v * 100).toFixed(1) + "%";
  const a = Math.abs(v);
  return v.toLocaleString("en-US", { maximumFractionDigits: a < 1 ? 3 : a < 100 ? 2 : 1 });
}

function fmtShort(v, fmt) {
  if (v == null || !isFinite(v)) return "—";
  if (fmt === "pct") return (v * 100).toFixed(0) + "%";
  const a = Math.abs(v), sign = v < 0 ? "-" : "";
  let s;
  if (a >= 1e9) s = (a / 1e9).toFixed(1) + "B";
  else if (a >= 1e6) s = (a / 1e6).toFixed(a >= 1e7 ? 0 : 1) + "M";
  else if (a >= 1e3) s = (a / 1e3).toFixed(a >= 1e4 ? 0 : 1) + "k";
  else s = a.toLocaleString("en-US", { maximumFractionDigits: a < 1 ? 2 : a < 10 ? 1 : 0 });
  return (fmt === "money" ? "$" : "") + sign + s;
}

function quantile(sorted, p) {
  if (!sorted.length) return null;
  const i = (sorted.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

function niceTicks(lo, hi, want) {
  if (!(hi > lo)) return [lo];
  const raw = (hi - lo) / want, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag, step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const out = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + step * 1e-9; t += step) out.push(+t.toFixed(10));
  return out;
}

function logTicks(lo, hi) {
  const out = [];
  for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++)
    for (const m of [1, 3]) {
      const t = m * Math.pow(10, e);
      if (t >= lo * 0.999 && t <= hi * 1.001) out.push(t);
    }
  return out.length > 1 ? out : [lo, hi];
}

/* --- Least squares --------------------------------------------------------
   The regression card on the voting tab is read from the bundle, because those
   specifications are fixed and j_vote_regs estimated them. A scatter fit cannot
   be: the year slider, both measure selectors, the two log boxes and the state
   filter multiply out to far more combinations than could be precomputed, so
   the line is estimated here — in plotted space, on exactly the points drawn,
   which is already how the correlation in each caption is produced.

   No library is loadable over file://, so the p-value comes from the
   regularised incomplete beta directly: for a two-sided t with df degrees of
   freedom, p = I_{df/(df+t^2)}(df/2, 1/2). */

const STAR_P = [0.01, 0.05, 0.1];
const star = p => p < STAR_P[0] ? "***" : p < STAR_P[1] ? "**" : p < STAR_P[2] ? "*" : "";

const LG_C = [76.18009172947146, -86.50532032941677, 24.01409824083091,
              -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];

function lgamma(x) {
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += LG_C[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/* Continued fraction for the incomplete beta, Lentz's method. */
function betacf(a, b, x) {
  const TINY = 1e-30, EPS = 3e-16;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function betai(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) +
                      a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a
                                   : 1 - bt * betacf(b, a, 1 - x) / b;
}

/* Two-sided p for a t statistic. */
function tPval(t, df) {
  if (!isFinite(t) || !(df > 0)) return NaN;
  return betai(df / 2, 0.5, df / (df + t * t));
}

/* Bivariate OLS with HC1 standard errors — the applied default, since these are
   raw cross-sections and homoskedasticity is not a claim worth making here.
   se(b)^2 = n/(n-2) * Sxx^-2 * sum( (x_i - xbar)^2 e_i^2 ). */
function olsFit(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; }
  mx /= n; my /= n;
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    sxx += dx * dx; sxy += dx * dy; syy += dy * dy;
  }
  if (!(sxx > 0) || !(syy > 0)) return null;
  const slope = sxy / sxx, intercept = my - slope * mx;
  let meat = 0, ssr = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, e = ys[i] - intercept - slope * xs[i];
    meat += dx * dx * e * e; ssr += e * e;
  }
  const se = Math.sqrt((n / (n - 2)) * meat / (sxx * sxx));
  const t = slope / se;
  return { n, slope, intercept, se, t, p: tPval(t, n - 2), r2: 1 - ssr / syy };
}

/* Liang-Barsky against the top and bottom of the plot rectangle. The fit's two
   endpoints are already the left and right edges, so only y needs clipping — a
   steep line would otherwise be painted straight over the axis labels. Returns
   null when the segment misses the band entirely. */
function clipY(x0, y0, x1, y1, yTop, yBot) {
  let t0 = 0, t1 = 1;
  const dx = x1 - x0, dy = y1 - y0;
  for (const [p, q] of [[-dy, y0 - yTop], [dy, yBot - y0]]) {
    if (p === 0) { if (q < 0) return null; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; }
    else       { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  return [x0 + t0 * dx, y0 + t0 * dy, x0 + t1 * dx, y0 + t1 * dy];
}

/* --- Fit overlay and its coefficient table --------------------------------
   Shared by all three scatters. `pts` are the records the caller already
   filtered and log-transformed, so the fit is in the units on screen; each
   group is {label, pick, color, width}. Groups are drawn back to front in the
   order given, so the caller lists the total last and it lands on top. Every
   path is pointer-events:none — the scatters delegate clicks off their circles,
   and an overlay would otherwise swallow them. */

function fitOverlay(pts, groups, X, Y, x0, x1, yTop, yBot) {
  let svg = "";
  const fits = groups.map(g => {
    const sel = pts.filter(g.pick);
    const f = olsFit(sel.map(p => p.a), sel.map(p => p.b));
    if (!f) return { group: g, fit: null, n: sel.length };
    const seg = clipY(X(x0), Y(f.intercept + f.slope * x0),
                      X(x1), Y(f.intercept + f.slope * x1), yTop, yBot);
    if (seg)
      svg += `<path class="fit-line" d="M${seg[0].toFixed(1)},${seg[1].toFixed(1)}` +
             `L${seg[2].toFixed(1)},${seg[3].toFixed(1)}" fill="none" ` +
             `stroke="${g.color}" stroke-width="${g.width}" pointer-events="none"/>`;
    return { group: g, fit: f, n: f.n };
  });
  return { svg, fits };
}

/* Both axes are whatever measure the reader picked, so the slope's magnitude is
   not known in advance: a vote share on offices per 10,000 lands near 0.0007,
   which four fixed decimals would report as one significant digit. Decimals are
   set from the standard error instead — enough to carry three of its digits,
   never fewer than the four the rest of the page uses. */
function fitDecimals(se) {
  if (!isFinite(se) || se <= 0) return 4;
  return Math.min(8, Math.max(4, 2 - Math.floor(Math.log10(se))));
}

function fitTable(tbodyId, footId, fits, unitNote) {
  $(tbodyId).innerHTML = fits.map(({ group, fit, n }) => {
    const key = `<span class="fit-swatch" style="border-top-color:${group.color}"></span>` +
                esc(group.label);
    if (!fit)
      return `<tr><td>${key}</td><td>${n.toLocaleString()}</td>` +
             `<td class="na">—</td><td class="na">—</td></tr>`;
    const d = fitDecimals(fit.se);
    return `<tr><td>${key}</td><td>${fit.n.toLocaleString()}</td>` +
           `<td>${fit.slope.toFixed(d)}${star(fit.p)}<span class="se"> (${
             fit.se.toFixed(d)})</span></td>` +
           `<td>${fit.r2.toFixed(3)}</td></tr>`;
  }).join("");
  $(footId).textContent =
    `Least squares slope in plotted units${unitNote}. HC1 robust standard errors ` +
    `in parentheses. *** p<0.01, ** p<0.05, * p<0.10. Estimated on the points ` +
    `drawn, so these are raw associations with no controls.`;
}

/* Both scatters can end up with nothing to plot; the table has to go with it,
   or a stale set of coefficients outlives the cloud it described. */
function clearFits(tbodyId, footId) {
  $(tbodyId).innerHTML = "";
  $(footId).textContent = "";
}

/* A slope on a logged axis is an elasticity, not a level effect, so the table's
   foot has to say which axes were logged before it was taken. */
const logNote = (xl, yl) => xl && yl ? ", both axes log₁₀"
  : xl ? ", horizontal axis log₁₀"
  : yl ? ", vertical axis log₁₀" : "";

/* The three fits every county scatter reports. Colours are read at draw time,
   never cached at module scope: readTokens() re-resolves them when the OS theme
   flips, and the total is --fg, which is black on white and white on charcoal.
   The total is listed last so it is painted over the two subgroups. */
function fdGroups(fdYear) {
  return [
    { label: "No free delivery", color: C1, width: 1.6,
      pick: p => fdYear[p.ci] == null },
    { label: "Free delivery", color: C2, width: 1.6,
      pick: p => fdYear[p.ci] != null },
    { label: "Total", color: FG, width: 2.2, pick: () => true },
  ];
}

/* --- Bundled LaTeX tables --------------------------------------------------
   One card per registered fragment, built from the parsed rows rather than from
   markup, so a table registered in l_web_tables appears here with no edit to
   index.html. Sections are the fragment's own \midrule breaks and are drawn as
   rules, which is what separates a regression's coefficients from its N. */

function tableCard(t) {
  const align = i => (t.align[i] === "l" ? "left" : t.align[i] === "c" ? "center" : "right");
  const head = t.header.map((h, i) =>
    `<th style="text-align:${align(i)}">${esc(h)}</th>`).join("");

  /* Only the first row of a later section carries the rule, so the border lands
     where the fragment's \midrule is rather than under every row after it. */
  const body = t.sections.map((rows, si) => rows.map((r, ri) =>
    `<tr${si && !ri ? ' class="rule"' : ""}>` + r.map((c, i) =>
      /* A fragment's standard-error rows have an empty first cell and read as a
         continuation of the row above; dimming them keeps the coefficient the
         thing you see first, exactly as the printed table does with parentheses. */
      `<td style="text-align:${align(i)}"${!r[0] ? ' class="se"' : ""}>${esc(c)}</td>`
    ).join("") + "</tr>").join("")).join("");

  return `<div class="card tbl-card">
    <div class="card-head"><div>
      <h2>${esc(t.title)}</h2>
      <p class="cap">${esc(t.caption)}</p>
    </div></div>
    <div class="table-scroll">
      <table class="reg static"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
    </div>
    <p class="cap src">output/tabs/${esc(t.key)}.tex</p>
  </div>`;
}

/* Filled once at start-up: the fragments are static, so there is nothing for a
   year slider or a measure selector to change. */
function drawTables() {
  if (!TB) return;
  const byTab = {};
  for (const key of TB.order) {
    const t = TB.tables[key];
    (byTab[t.tab] = byTab[t.tab] || []).push(t);
  }
  for (const [tab, list] of Object.entries(byTab)) {
    const host = $("t-" + tab);
    if (!host) continue;
    host.innerHTML = `<h2 class="tables-head">Tables</h2>` + list.map(tableCard).join("");
  }
}

/* --- Projection ------------------------------------------------------------
   Albers equal-area conic, one instance per frame: the lower 48 plus insets for
   Hawaii and Puerto Rico, which together hold four of the 1,507 offices. */

const RAD = Math.PI / 180;

function albers(phi0, phi1, phi2, lam0) {
  const n = 0.5 * (Math.sin(phi1 * RAD) + Math.sin(phi2 * RAD));
  const C = Math.pow(Math.cos(phi1 * RAD), 2) + 2 * n * Math.sin(phi1 * RAD);
  const rho0 = Math.sqrt(C - 2 * n * Math.sin(phi0 * RAD)) / n;
  return (lon, lat) => {
    const theta = n * ((lon - lam0) * RAD);
    const rho = Math.sqrt(Math.max(0, C - 2 * n * Math.sin(lat * RAD))) / n;
    // Albers returns y positive northward; SVG's y grows downward, so negate it.
    return [rho * Math.sin(theta), rho * Math.cos(theta) - rho0];
  };
}

function projBounds(proj, rings) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const ring of rings)
    for (let i = 0; i < ring.length; i += 2) {
      const p = proj(ring[i], ring[i + 1]);
      if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
    }
  return [x0, y0, x1, y1];
}

function fit(proj, rings, box) {
  const [x0, y0, x1, y1] = projBounds(proj, rings);
  const k = Math.min((box[2] - box[0]) / (x1 - x0), (box[3] - box[1]) / (y1 - y0));
  const tx = box[0] + ((box[2] - box[0]) - (x1 - x0) * k) / 2 - x0 * k;
  const ty = box[1] + ((box[3] - box[1]) - (y1 - y0) * k) / 2 - y0 * k;
  return (lon, lat) => { const p = proj(lon, lat); return [p[0] * k + tx, p[1] * k + ty]; };
}

const MAP_BOX = [12, 10, 963, 550];
const GEO_BY_NAME = new Map(G.states.map(s => [s.name, s]));

function lonlatBounds(rings) {
  let lon0 = Infinity, lat0 = Infinity, lon1 = -Infinity, lat1 = -Infinity;
  for (const r of rings)
    for (let i = 0; i < r.length; i += 2) {
      if (r[i] < lon0) lon0 = r[i]; if (r[i] > lon1) lon1 = r[i];
      if (r[i + 1] < lat0) lat0 = r[i + 1]; if (r[i + 1] > lat1) lat1 = r[i + 1];
    }
  return [lon0, lat0, lon1, lat1];
}

/* The whole country: the lower 48, with Hawaii and Puerto Rico as insets. */
function nationalView() {
  const frames = {
    conus: { proj: albers(37.5, 29.5, 45.5, -96), box: MAP_BOX, states: [] },
    hi:    { proj: albers(13, 8, 18, -157),   box: [38, 466, 148, 540], states: [], label: "Hawaii" },
    pr:    { proj: albers(18, 17, 19, -66.4), box: [168, 492, 252, 540], states: [], label: "Puerto Rico" },
  };
  for (const st of G.states)
    frames[st.abbr === "HI" ? "hi" : st.abbr === "PR" ? "pr" : "conus"].states.push(st);
  for (const f of Object.values(frames)) f.fitted = fit(f.proj, f.states.flatMap(s => s.rings), f.box);

  let basemap = "";
  for (const key of ["conus", "hi", "pr"]) {
    const f = frames[key];
    if (key !== "conus")
      basemap += `<rect x="${f.box[0] - 6}" y="${f.box[1] - 6}" width="${f.box[2] - f.box[0] + 12}" ` +
        `height="${f.box[3] - f.box[1] + 12}" class="inset-frame"/>` +
        `<text class="inset-lab" x="${f.box[0] - 4}" y="${f.box[1] - 10}">${f.label}</text>`;
    for (const st of f.states)
      for (const ring of st.rings)
        basemap += `<path class="state-fill" d="${ringPath(ring, f.fitted)}"/>`;
  }
  const frameFor = (lon, lat) =>
    lon < -140 ? frames.hi : (lon > -70 && lat < 25) ? frames.pr : frames.conus;
  return { basemap, viewBox: "0 0 975 600", clip: null,
           project: (lon, lat) => frameFor(lon, lat).fitted(lon, lat) };
}

/* One state, filling the frame: the cone is re-centred on that state's own
   bounds, so the projection stays honest well away from the national parallels. */
function stateView(name) {
  const st = GEO_BY_NAME.get(name);
  if (!st) return nationalView();
  const [lon0, lat0, lon1, lat1] = lonlatBounds(st.rings), span = lat1 - lat0;
  const proj = albers((lat0 + lat1) / 2, lat0 + span / 6, lat1 - span / 6, (lon0 + lon1) / 2);

  // Shape the frame to the state so a wide state does not leave half the card
  // empty, clamped so no state makes an absurdly tall or squat map.
  const [x0, y0, x1, y1] = projBounds(proj, st.rings);
  const aspect = Math.max(1.25, Math.min(2.4, (x1 - x0) / (y1 - y0)));
  const W = 975, H = Math.round(W / aspect);
  const fitted = fit(proj, st.rings, [12, 10, W - 12, H - 10]);
  const rings = st.rings.map(r => ringPath(r, fitted));
  return {
    basemap: rings.map(d => `<path class="state-fill" d="${d}"/>`).join(""),
    project: fitted,
    viewBox: `0 0 ${W} ${H}`,
    // The railroad bundle is national; in a state frame it is cut to the state.
    clip: rings,
  };
}

const viewCache = new Map();
function view() {
  const key = S.state || "";
  if (!viewCache.has(key)) viewCache.set(key, key ? stateView(key) : nationalView());
  return viewCache.get(key);
}

/* --- Shapes ---------------------------------------------------------------- */

function ringPath(ring, fitted) {
  let d = "";
  for (let i = 0; i < ring.length; i += 2) {
    const p = fitted(ring[i], ring[i + 1]);
    d += (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1);
  }
  return d + "Z";
}

/* Bars are square: tokens.css sets --border-radius: 0 across the design system,
   so nothing on the page rounds. The radius argument is kept so the helpers stay
   general, and every caller passes 0. */
function hBar(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w));
  return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}` +
         `Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
}
function vBar(x, base, w, h, r) {
  r = Math.max(0, Math.min(r, h, w / 2));
  const t = base - h;
  return `M${x},${base}V${t + r}Q${x},${t} ${x + r},${t}H${x + w - r}` +
         `Q${x + w},${t} ${x + w},${t + r}V${base}Z`;
}

/* --- Tooltip --------------------------------------------------------------- */

const tip = $("tip");
function showTip(html, ev) {
  tip.innerHTML = html;
  tip.style.opacity = 1;
  const r = tip.getBoundingClientRect();
  let x = ev.clientX + 14, y = ev.clientY + 14;
  if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - 14;
  if (y + r.height > innerHeight - 8) y = ev.clientY - r.height - 14;
  tip.style.left = x + "px"; tip.style.top = y + "px";
}
const hideTip = () => { tip.style.opacity = 0; };

const hlStyle = document.createElement("style");
document.head.appendChild(hlStyle);
function highlight(o) {
  hlStyle.textContent = o == null ? "" :
    `[data-o="${o}"]{stroke:${FG}!important;stroke-width:2.5px!important}` +
    `tr[data-o="${o}"]{background:${PIN_ROW}!important}`;
}

function officeTip(o, r) {
  const rows = [S.size, S.color, "Receipts", "Cost", "Carriers", "Boxes", "Served"]
    .filter((k, i, a) => k && a.indexOf(k) === i && VAR.has(k))
    .map(k => `<tr><td>${esc(VAR.get(k).label)}</td><td>${
      fmtValue(r == null ? null : D.panel[k][r], VAR.get(k).fmt)}</td></tr>`).join("");
  return `<div class="t-name">${esc(D.offices.city[o])}</div>` +
         `<div class="t-sub">${esc(D.offices.state[o])} &middot; ${YEARS[S.yi]}` +
         (D.offices.founded[o] ? ` &middot; free delivery from ${D.offices.founded[o]}` : "") +
         `</div><table>${rows}</table>`;
}

/* --- Current slice --------------------------------------------------------- */

function slice() {
  const out = [];
  for (const r of rowsByYear[S.yi]) {
    const o = D.panel.o[r];
    if (S.state && D.offices.state[o] !== S.state) continue;
    out.push({ r, o, v: D.panel[S.size][r] });
  }
  return out;
}

function scales(rows) {
  const vals = rows.map(d => d.v).filter(v => v != null).map(Math.abs).sort((a, b) => a - b);
  const ref = quantile(vals, 0.99) || 1;
  const RMIN = 1.7, RMAX = 16;
  const radius = v => v == null ? 2.2 :
    RMIN + (RMAX - RMIN) * Math.sqrt(Math.min(Math.abs(v), ref) / ref);

  let color = null;
  if (S.color) {
    const cv = rows.map(d => D.panel[S.color][d.r]).filter(v => v != null).sort((a, b) => a - b);
    const meta = VAR.get(S.color);
    if (cv.length) {
      if (meta.diverging) {
        const m = quantile(cv.map(Math.abs).sort((a, b) => a - b), 0.9) || 1;
        color = { ramp: DIV, breaks: [-m / 2, -m / 8, m / 8, m / 2] };
      } else {
        color = { ramp: SEQ, breaks: [0.2, 0.4, 0.6, 0.8].map(p => quantile(cv, p)) };
      }
      color.of = v => {
        if (v == null) return MISSING;
        let i = 0; while (i < color.breaks.length && v > color.breaks[i]) i++;
        return color.ramp[i];
      };
    }
  }
  return { radius, ref, color, vals };
}

/* --- Map ------------------------------------------------------------------- */

/* The office circles for one year, as SVG strings. Both maps draw the same marks,
   so the delegated hover/click handlers reach either without extra wiring. */
function officeMarks(rows, sc, V) {
  const marks = [], missing = [];
  for (const d of rows) {
    const [x, y] = V.project(D.offices.lon[d.o], D.offices.lat[d.o]);
    if (d.v == null) {
      if (!S.hideMissing)
        missing.push(`<circle class="office miss mark" data-o="${d.o}" data-r="${d.r}" ` +
          `cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6"/>`);
      continue;
    }
    marks.push({ x, y, r: sc.radius(d.v), o: d.o, row: d.r, v: Math.abs(d.v) });
  }
  marks.sort((a, b) => b.r - a.r);           // big circles behind, so small stay clickable
  const body = marks.map(m =>
    `<circle class="office mark${S.pin === m.o ? " pin" : ""}" data-o="${m.o}" data-r="${m.row}" ` +
    `cx="${m.x.toFixed(1)}" cy="${m.y.toFixed(1)}" r="${m.r.toFixed(1)}" ` +
    `fill="${sc.color ? sc.color.of(D.panel[S.color][m.row]) : C1}" ` +
    `fill-opacity="${sc.color ? 0.95 : 0.72}"/>`).join("");

  return { missing: missing.join(""), body, n: marks.length };
}

function drawMap(rows, sc) {
  const meta = VAR.get(S.size), V = view();
  const m = officeMarks(rows, sc, V);

  $("map").setAttribute("viewBox", V.viewBox);
  $("map").innerHTML = V.basemap + m.missing + m.body;

  const n = m.n, nmiss = rows.length - n;
  $("map-title").textContent = meta.label + ", " + (S.state ? S.state + ", " : "") + YEARS[S.yi];
  $("map-cap").textContent =
    `Circle area is ${meta.label.toLowerCase()}${meta.diverging ? " (absolute value)" : ""}` +
    (S.color ? `; colour is ${VAR.get(S.color).label.toLowerCase()}` : "") + ". " +
    `${n.toLocaleString()} of ${rows.length.toLocaleString()} offices report it` +
    (nmiss ? `; ${nmiss.toLocaleString()} shown as hollow rings.` : ".");

  drawLegend(sc, meta, "map-legend");
}

function drawLegend(sc, meta, target, lead) {
  const refs = [0.08, 0.4, 1].map(f => f * sc.ref);
  const size = `<div><div class="legend-lab">${esc(meta.label)}</div>` +
    // The largest circle is RMAX=16 about cy=26, so it reaches y=42; the labels
    // have to clear that, not sit on it.
    `<svg viewBox="0 0 200 54" style="width:200px">` +
    refs.map((v, i) => {
      const r = sc.radius(v), cx = 24 + i * 62;
      return `<circle cx="${cx}" cy="26" r="${r.toFixed(1)}" fill="none" stroke="${INK3}"/>` +
             `<text class="mark-label" x="${cx}" y="52" text-anchor="middle">${fmtShort(v, meta.fmt)}</text>`;
    }).join("") + `</svg></div>`;

  let color = "";
  if (sc.color) {
    const cm = VAR.get(S.color);
    color = `<div><div class="legend-lab">${esc(cm.label)}</div>` +
      `<div class="swatches">` + sc.color.ramp.map(c => `<span class="sw" style="background:${c}"></span>`).join("") +
      `</div><div class="sw-ticks"><span></span>` +
      sc.color.breaks.map(b => `<span>${fmtShort(b, cm.fmt)}</span>`).join("") + `</div></div>`;
  }
  const miss = `<div class="legend-item"><svg width="14" height="14" style="width:14px">` +
    `<circle cx="7" cy="9" r="2.6" fill="none" stroke="${MISSING}" stroke-width="1.5"/></svg>` +
    `Present, measure not reported</div>`;
  $(target).innerHTML = (lead || "") + size + color + miss;
}

/* --- Railroads -------------------------------------------------------------
   The bundle stores each vintage's lines as integer deltas on a 1/scale degree
   grid, so decoding and projecting is the only real work here. It is done once
   per view and cached: after that, changing the year is string concatenation.

   The layer is cumulative — a vintage drawn in one year is drawn in every later
   year too — so the paths accumulate rather than swap. */

const railCache = new Map();

/* A state view frames one state but the bundle is national, so lines nowhere near
   it are dropped before the projection runs. The margin only has to cover lines
   that cross the border; the clip path decides what is finally drawn. */
function railWindow(stateName) {
  const st = stateName && GEO_BY_NAME.get(stateName);
  if (!st) return null;
  const [lon0, lat0, lon1, lat1] = lonlatBounds(st.rings);
  const px = (lon1 - lon0) * 0.05, py = (lat1 - lat0) * 0.05;
  return [lon0 - px, lat0 - py, lon1 + px, lat1 + py];
}

/* `stateName` is the frame to cull against, and is not always S.state: the county
   tab keeps its own filter, and its state names are the period ones from the 1900
   census, which the modern outline file does not carry. Passing "" there simply
   skips the cull and lets the clip path do the work. */
function railPaths(key, V, stateName) {
  if (railCache.has(key)) return railCache.get(key);

  const k = 1 / R.scale, win = railWindow(stateName);
  const xy = [];

  const toPath = lines => {
    let d = "";
    for (const ln of lines) {
      // Deltas first: decoding is cheap, and it says whether projecting is worth it.
      let ix = ln[0], iy = ln[1];
      let x0 = ix, y0 = iy, x1 = ix, y1 = iy;
      xy.length = 0;
      xy.push(ix, iy);
      for (let i = 2; i < ln.length; i += 2) {
        ix += ln[i]; iy += ln[i + 1];
        xy.push(ix, iy);
        if (ix < x0) x0 = ix; else if (ix > x1) x1 = ix;
        if (iy < y0) y0 = iy; else if (iy > y1) y1 = iy;
      }
      if (win && (x1 * k < win[0] || x0 * k > win[2] || y1 * k < win[1] || y0 * k > win[3]))
        continue;
      for (let i = 0; i < xy.length; i += 2) {
        const p = V.project(xy[i] * k, xy[i + 1] * k);
        d += (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1);
      }
    }
    return d;
  };

  const paths = { base: toPath(R.base), adds: R.adds.map(a => ({ year: a.year, d: toPath(a.lines) })) };
  railCache.set(key, paths);
  return paths;
}

function drawRailMap(rows, sc) {
  const meta = VAR.get(S.size), V = view(), year = YEARS[S.yi];
  const P = railPaths(S.state || "", V, S.state);
  const info = R.byYear.find(b => b.year === year) || R.byYear[R.byYear.length - 1];

  // Anything running before the panel opens is the muted base; what arrives
  // during the window comes forward, and stays forward once it has arrived.
  const added = P.adds.filter(a => a.year <= year).map(a => a.d).join("");
  const m = officeMarks(rows, sc, V);

  const clip = V.clip
    ? `<clipPath id="rail-clip">${V.clip.map(d => `<path d="${d}"/>`).join("")}</clipPath>`
    : "";
  $("rmap").setAttribute("viewBox", V.viewBox);
  $("rmap").innerHTML = V.basemap + clip +
    `<g${V.clip ? ' clip-path="url(#rail-clip)"' : ""}>` +
    `<path class="rail rail-old" d="${P.base}"/>` +
    (added ? `<path class="rail rail-new" d="${added}"/>` : "") + `</g>` +
    m.missing + m.body;

  const base = R.byYear[0], gained = info.miles - base.miles;
  $("r-f-miles").textContent = info.miles.toLocaleString();
  $("r-f-seg").textContent = info.n.toLocaleString();
  $("r-f-new").textContent = gained ? "+" + gained.toLocaleString() : "0";
  $("r-f-offices").textContent = rows.length.toLocaleString();

  const nmiss = rows.length - m.n;
  $("rmap-title").textContent = "Post offices and the railroad network, " +
    (S.state ? S.state + ", " : "") + year;
  $("rmap-cap").textContent =
    `Railroads in operation by ${info.vintage}` +
    (info.vintage === year ? "" : ` (latest Atack cross-section on or before ${year})`) +
    ` — ${info.miles.toLocaleString()} route-miles` +
    (gained ? `, of which ${gained.toLocaleString()} were added after ${base.year}` : "") + ". " +
    `Circle area is ${meta.label.toLowerCase()}${meta.diverging ? " (absolute value)" : ""}` +
    (S.color ? `; colour is ${VAR.get(S.color).label.toLowerCase()}` : "") + ". " +
    `${m.n.toLocaleString()} of ${rows.length.toLocaleString()} offices report it` +
    (nmiss ? `; ${nmiss.toLocaleString()} shown as hollow rings.` : ".");

  const key = `<div><div class="legend-lab">Railroad track</div>` +
    `<div class="legend-item"><span class="rail-key old"></span>In operation by ${base.year}</div>` +
    (added ? `<div class="legend-item"><span class="rail-key new"></span>` +
             `Added ${base.year + 1}–${year}</div>` : "") + `</div>`;
  drawLegend(sc, meta, "rmap-legend", key);
}

/* --- Coverage strip -------------------------------------------------------- */

function drawCoverage() {
  const meta = VAR.get(S.size), cov = meta.coverage;
  const W = 900, H = 52, top = 4, base = 36, bw = W / NY;
  const max = Math.max(...D.counts);
  let s = "";
  for (let i = 0; i < NY; i++) {
    const hAll = (D.counts[i] / max) * (base - top);
    const hVal = (cov[i] / max) * (base - top);
    const x = i * bw + 4;
    s += `<path d="${vBar(x, base, bw - 8, hAll, 0)}" fill="${COV_ALL}"/>`;
    if (cov[i]) s += `<path d="${vBar(x, base, bw - 8, hVal, 0)}" fill="${i === S.yi ? C1 : COV_OFF}"/>`;
    s += `<text class="mark-label" x="${x + (bw - 8) / 2}" y="${base + 13}" text-anchor="middle" ` +
         `fill="${i === S.yi ? FG : INK3}">${YEARS[i]}</text>`;
    if (i === S.yi || cov[i] === 0)
      s += `<text class="mark-label" x="${x + (bw - 8) / 2}" y="${base - hVal - 4}" text-anchor="middle" ` +
           `fill="${cov[i] ? INK2 : COV_NONE}">${cov[i] ? cov[i].toLocaleString() : "none"}</text>`;
  }
  $("coverage-svg").innerHTML = s;
  $("coverage-lab").innerHTML =
    `<b>Coverage</b> &mdash; offices reporting ${esc(meta.label.toLowerCase())} each year ` +
    `(shaded) against all offices in the panel (grey).`;
  const note = $("var-note");
  note.hidden = !meta.note;
  note.textContent = meta.note || "";
}

/* --- National time series -------------------------------------------------- */

function drawSeries() {
  const meta = VAR.get(S.size), W = 420, H = 230, L = 52, R = 12, T = 12, B = 26;
  const pts = YEARS.map((yr, i) => {
    let sum = 0, n = 0;
    for (const r of rowsByYear[i]) {
      if (S.state && D.offices.state[D.panel.o[r]] !== S.state) continue;
      const v = D.panel[meta.key][r];
      if (v != null) { sum += v; n++; }
    }
    return { yr, v: n ? (meta.agg === "sum" ? sum : sum / n) : null, n };
  });
  const vals = pts.map(p => p.v).filter(v => v != null);
  if (!vals.length) { $("ts").innerHTML = emptyNote(W, H); $("ts-cap").textContent = "No data."; return; }

  const lo = Math.min(0, ...vals), hi = Math.max(...vals);
  const x = i => L + (i / (NY - 1)) * (W - L - R);
  const y = v => H - B - ((v - lo) / (hi - lo || 1)) * (H - T - B);
  const ticks = niceTicks(lo, hi, 4);

  let s = ticks.map(t => `<line class="grid-line" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/>` +
    `<text class="mark-label" x="${L - 6}" y="${y(t) + 3}" text-anchor="end">${fmtShort(t, meta.fmt)}</text>`).join("");
  s += `<line class="grid-line" x1="${x(S.yi)}" x2="${x(S.yi)}" y1="${T}" y2="${H - B}" stroke="${C1}" stroke-dasharray="3 3"/>`;

  let d = "", open = false;
  pts.forEach((p, i) => {
    if (p.v == null) { open = false; return; }
    d += (open ? "L" : "M") + x(i).toFixed(1) + "," + y(p.v).toFixed(1); open = true;
  });
  s += `<path d="${d}" fill="none" stroke="${C1}" stroke-width="2" stroke-linejoin="round"/>`;

  const cur = pts[S.yi];
  if (cur.v != null) {
    s += `<circle cx="${x(S.yi)}" cy="${y(cur.v)}" r="4.5" fill="${C1}" stroke="${BG}" stroke-width="2"/>`;
    const anchor = S.yi > NY / 2 ? "end" : "start";
    s += `<text class="mark-label" x="${x(S.yi) + (anchor === "end" ? -8 : 8)}" y="${y(cur.v) - 9}" ` +
         `text-anchor="${anchor}" fill="${FG}">${fmtValue(cur.v, meta.fmt)}</text>`;
  }
  [0, NY - 1].forEach(i => s += `<text class="mark-label" x="${x(i)}" y="${H - 8}" ` +
    `text-anchor="${i ? "end" : "start"}">${YEARS[i]}</text>`);

  s += `<rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent" id="ts-hit"/>`;
  $("ts").innerHTML = s;

  $("ts-title").textContent = (meta.agg === "sum" ? "National total: " : "National average: ") + meta.label;
  $("ts-cap").textContent = (meta.agg === "sum" ? "Sum" : "Mean") + " across " +
    (S.state ? "offices in " + S.state : "all offices") +
    " reporting in each year. Gaps are years with no reports.";

  $("ts").addEventListener("mousemove", ev => {
    const box = $("ts").getBoundingClientRect();
    const px = ((ev.clientX - box.left) / box.width) * W;
    let i = Math.round(((px - L) / (W - L - R)) * (NY - 1));
    i = Math.max(0, Math.min(NY - 1, i));
    const p = pts[i];
    showTip(`<div class="t-name">${p.yr}</div><table>` +
      `<tr><td>${esc(meta.label)}</td><td>${fmtValue(p.v, meta.fmt)}</td></tr>` +
      `<tr><td>Offices reporting</td><td>${p.n.toLocaleString()}</td></tr></table>`, ev);
  });
  $("ts").addEventListener("mouseleave", hideTip);
}

const emptyNote = (W, H) =>
  `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" class="mark-label">No office reports this measure here.</text>`;

/* --- Histogram ------------------------------------------------------------- */

function drawHist(rows) {
  const meta = VAR.get(S.size), W = 420, H = 230, L = 40, R = 12, T = 14, B = 30;
  let vals = rows.map(d => d.v).filter(v => v != null);
  const useLog = meta.log && vals.every(v => v > 0);
  if (useLog) vals = vals.map(Math.log10);
  if (vals.length < 2) { $("hist").innerHTML = emptyNote(W, H); $("hist-cap").textContent = "Too few reports."; return; }

  const lo = Math.min(...vals), hi = Math.max(...vals), nb = 24, bw = (hi - lo) / nb || 1;
  const bins = new Array(nb).fill(0);
  for (const v of vals) bins[Math.min(nb - 1, Math.floor((v - lo) / bw))]++;
  const maxN = Math.max(...bins);

  const x = v => L + ((v - lo) / (hi - lo || 1)) * (W - L - R);
  const y = n => H - B - (n / maxN) * (H - T - B);
  const ticks = niceTicks(0, maxN, 3);

  let s = ticks.map(t => `<line class="grid-line" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/>` +
    `<text class="mark-label" x="${L - 6}" y="${y(t) + 3}" text-anchor="end">${t}</text>`).join("");
  const pw = (W - L - R) / nb;
  bins.forEach((n, i) => {
    if (!n) return;
    s += `<path d="${vBar(L + i * pw + 1, H - B, pw - 2, (H - B) - y(n), 0)}" fill="${C1}" fill-opacity="0.82"/>`;
  });
  for (const t of (useLog ? niceTicks(lo, hi, 4) : niceTicks(lo, hi, 4)))
    s += `<text class="mark-label" x="${x(t)}" y="${H - 12}" text-anchor="middle">${
      fmtShort(useLog ? Math.pow(10, t) : t, meta.fmt)}</text>`;
  s += `<text class="ax-title" x="${(L + W - R) / 2}" y="${H - 1}" text-anchor="middle">${
    esc(meta.label)}${useLog ? " (log scale)" : ""}</text>`;
  $("hist").innerHTML = s;

  $("hist-title").textContent = "Distribution across offices, " + YEARS[S.yi];
  $("hist-cap").textContent = `${vals.length.toLocaleString()} offices; ` +
    `median ${fmtValue(useLog ? Math.pow(10, quantile(vals.slice().sort((a, b) => a - b), 0.5))
      : quantile(vals.slice().sort((a, b) => a - b), 0.5), meta.fmt)}.`;
}

/* --- Top 20 ---------------------------------------------------------------- */

function drawTop(rows) {
  const meta = VAR.get(S.size), W = 420, H = 470, L = 128, R = 56, T = 6;
  const top = rows.filter(d => d.v != null).sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 20);
  if (!top.length) { $("top").innerHTML = emptyNote(W, H); $("top-cap").textContent = "No reports."; return; }
  const max = Math.abs(top[0].v), rowH = (H - T - 8) / top.length, bh = Math.min(15, rowH - 4);

  let s = "";
  top.forEach((d, i) => {
    const y = T + i * rowH, w = (Math.abs(d.v) / max) * (W - L - R);
    s += `<path class="mark" data-o="${d.o}" data-r="${d.r}" d="${hBar(L, y, Math.max(w, 1.5), bh, 0)}" ` +
         `fill="${S.pin === d.o ? C2 : C1}" fill-opacity="0.85"/>`;
    s += `<text class="mark-label" x="${L - 6}" y="${y + bh - 3}" text-anchor="end" fill="${INK2}">${
      esc(D.offices.city[d.o]).slice(0, 18)}</text>`;
    s += `<text class="mark-label" x="${L + Math.max(w, 1.5) + 6}" y="${y + bh - 3}">${
      fmtShort(d.v, meta.fmt)}</text>`;
  });
  $("top").innerHTML = s;
  $("top-title").textContent = "Twenty largest, " + YEARS[S.yi];
  $("top-cap").textContent = "By " + meta.label.toLowerCase() +
    (S.state ? ", within " + S.state : "") + ".";
}

/* --- Scatter --------------------------------------------------------------- */

function drawScatter() {
  const mx = VAR.get(S.sx), my = VAR.get(S.sy);
  const W = 460, H = 400, L = 60, R = 14, T = 12, B = 46;
  const pts = [];
  for (const r of rowsByYear[S.yi]) {
    const o = D.panel.o[r];
    if (S.state && D.offices.state[o] !== S.state) continue;
    let a = D.panel[S.sx][r], b = D.panel[S.sy][r];
    if (a == null || b == null) continue;
    if (S.sxLog) { if (a <= 0) continue; a = Math.log10(a); }
    if (S.syLog) { if (b <= 0) continue; b = Math.log10(b); }
    pts.push({ a, b, o, r });
  }
  if (pts.length < 2) {
    $("scatter").innerHTML = emptyNote(W, H);
    $("scatter-cap").textContent = "Too few offices report both.";
    clearFits("sfit-body", "sfit-foot");
    return;
  }

  const ax = pts.map(p => p.a), by = pts.map(p => p.b);
  const x0 = Math.min(...ax), x1 = Math.max(...ax), y0 = Math.min(...by), y1 = Math.max(...by);
  const X = v => L + ((v - x0) / (x1 - x0 || 1)) * (W - L - R);
  const Y = v => H - B - ((v - y0) / (y1 - y0 || 1)) * (H - T - B);

  let s = "";
  for (const t of niceTicks(y0, y1, 4))
    s += `<line class="grid-line" x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}"/>` +
         `<text class="mark-label" x="${L - 6}" y="${Y(t) + 3}" text-anchor="end">${
           fmtShort(S.syLog ? Math.pow(10, t) : t, my.fmt)}</text>`;
  for (const t of niceTicks(x0, x1, 4))
    s += `<text class="mark-label" x="${X(t)}" y="${H - B + 15}" text-anchor="middle">${
      fmtShort(S.sxLog ? Math.pow(10, t) : t, mx.fmt)}</text>`;

  for (const p of pts)
    s += `<circle class="office mark${S.pin === p.o ? " pin" : ""}" data-o="${p.o}" data-r="${p.r}" ` +
         `cx="${X(p.a).toFixed(1)}" cy="${Y(p.b).toFixed(1)}" r="4" fill="${S.pin === p.o ? C2 : C1}" ` +
         `fill-opacity="0.5" stroke-width="1.2"/>`;

  /* Office level, so there is no free/nonfree split to draw: every office in the
     free city delivery statistical statement is a free delivery office. */
  const OF = fitOverlay(pts, [{ label: "Total", color: FG, width: 2.2, pick: () => true }],
                        X, Y, x0, x1, T, H - B);
  s += OF.svg;

  s += `<text class="ax-title" x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle">${
    esc(mx.label)}${S.sxLog ? " (log scale)" : ""}</text>`;
  s += `<text class="ax-title" transform="translate(14,${(T + H - B) / 2}) rotate(-90)" text-anchor="middle">${
    esc(my.label)}${S.syLog ? " (log scale)" : ""}</text>`;
  $("scatter").innerHTML = s;

  // Correlation on what is plotted, so the caption matches the axes.
  const ma = ax.reduce((s2, v) => s2 + v, 0) / ax.length, mb = by.reduce((s2, v) => s2 + v, 0) / by.length;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < ax.length; i++) { sab += (ax[i] - ma) * (by[i] - mb); saa += (ax[i] - ma) ** 2; sbb += (by[i] - mb) ** 2; }
  const rho = sab / Math.sqrt(saa * sbb);
  $("scatter-cap").textContent = `${YEARS[S.yi]}: ${pts.length.toLocaleString()} offices report both. ` +
    `Correlation as plotted ${rho.toFixed(3)}.`;
  fitTable("sfit-body", "sfit-foot", OF.fits, logNote(S.sxLog, S.syLog));
}

/* --- Detail panel ---------------------------------------------------------- */

const SPARKS = ["Receipts", "Cost", "Carriers", "Boxes", "RdeliveryMid"];

function drawDetail() {
  const body = $("detail-body");
  if (S.pin == null) { body.innerHTML = `<p class="empty">No office selected.</p>`; return; }
  const o = S.pin, rows = rowsByOffice[o];
  const seen = rows.map(r => YEARS[D.panel.y[r]]);

  let s = `<p class="dt-name">${esc(D.offices.city[o])}</p>` +
    `<p class="dt-meta">${esc(D.offices.state[o])} &middot; observed <span>${seen[0]}–${seen[seen.length - 1]}</span> ` +
    `(<span>${rows.length}</span> years)` +
    (D.offices.founded[o] ? `<br>Free delivery from <span>${D.offices.founded[o]}</span>` : "") +
    `<br>Coordinates <span>${D.offices.lat[o].toFixed(3)}, ${D.offices.lon[o].toFixed(3)}</span> ` +
    `(${esc(D.offices.coord_source[o] || "unknown source")})</p>`;

  for (const key of SPARKS) {
    const meta = VAR.get(key);
    const series = YEARS.map((yr, i) => {
      const r = rows.find(rr => D.panel.y[rr] === i);
      return r === undefined ? null : D.panel[key][r];
    });
    const vals = series.filter(v => v != null);
    const cur = series[S.yi];
    s += `<div class="spark"><div class="spark-head"><span>${esc(meta.label)}</span>` +
         `<b>${fmtValue(cur, meta.fmt)}</b></div>`;
    if (vals.length < 2) { s += `<div class="cap" style="margin:0">Not reported.</div></div>`; continue; }
    // The plot occupies the top of the box; the min/max labels sit clear beneath it.
    const W = 308, H = 54, PLOT = 38, lo = Math.min(...vals), hi = Math.max(...vals);
    const X = i => 2 + (i / (NY - 1)) * (W - 4);
    const Y = v => PLOT - ((v - lo) / (hi - lo || 1)) * (PLOT - 6);
    let d = "", open = false;
    series.forEach((v, i) => {
      if (v == null) { open = false; return; }
      d += (open ? "L" : "M") + X(i).toFixed(1) + "," + Y(v).toFixed(1); open = true;
    });
    s += `<svg viewBox="0 0 ${W} ${H}"><line class="grid-line" x1="${X(S.yi)}" x2="${X(S.yi)}" y1="2" y2="${PLOT}"/>` +
         `<path d="${d}" fill="none" stroke="${C1}" stroke-width="2" stroke-linejoin="round"/>` +
         (cur != null ? `<circle cx="${X(S.yi)}" cy="${Y(cur)}" r="3.5" fill="${C2}" stroke="${BG}" stroke-width="1.5"/>` : "") +
         `<text class="mark-label" x="2" y="${H - 2}">${fmtShort(lo, meta.fmt)}</text>` +
         `<text class="mark-label" x="${W / 2}" y="${H - 2}" text-anchor="middle">${YEARS[0]}–${YEARS[NY - 1]}</text>` +
         `<text class="mark-label" x="${W - 2}" y="${H - 2}" text-anchor="end">${fmtShort(hi, meta.fmt)}</text>` +
         `</svg></div>`;
  }
  s += `<button id="unpin" style="margin-top:8px">Clear selection</button>`;
  body.innerHTML = s;
  $("unpin").addEventListener("click", () => { S.pin = null; render(); });
}

/* --- Table ----------------------------------------------------------------- */

function tableCols() {
  const keys = [S.size, S.color, "Receipts", "Cost", "Carriers", "Boxes", "Served"]
    .filter((k, i, a) => k && VAR.has(k) && a.indexOf(k) === i).slice(0, 6);
  return [{ key: "city", label: "City" }, { key: "state", label: "State" },
          { key: "founded", label: "Free delivery from" }]
    .concat(keys.map(k => ({ key: k, label: VAR.get(k).short || VAR.get(k).label,
                             fmt: VAR.get(k).fmt, num: true })));
}

function drawTable(rows) {
  const cols = tableCols();
  const q = S.search.trim().toLowerCase();
  let data = rows.filter(d => !q ||
    D.offices.city[d.o].toLowerCase().includes(q) || D.offices.state[d.o].toLowerCase().includes(q));

  const get = (d, c) => c.num ? D.panel[c.key][d.r] :
    c.key === "founded" ? D.offices.founded[d.o] : D.offices[c.key][d.o];

  if (S.sortCol) {
    const c = cols.find(x => x.key === S.sortCol) || cols[0];
    data = data.slice().sort((p, q2) => {
      const a = get(p, c), b = get(q2, c);
      if (a == null) return 1;
      if (b == null) return -1;
      return (a > b ? 1 : a < b ? -1 : 0) * S.sortDir;
    });
  } else {
    data = data.slice().sort((p, q2) => (q2.v == null ? -Infinity : Math.abs(q2.v)) -
                                        (p.v == null ? -Infinity : Math.abs(p.v)));
  }

  $("table").querySelector("thead").innerHTML = "<tr>" + cols.map(c =>
    `<th data-col="${c.key}">${esc(c.label)}${S.sortCol === c.key ?
      ` <span class="dir">${S.sortDir > 0 ? "▲" : "▼"}</span>` : ""}</th>`).join("") + "</tr>";

  $("table").querySelector("tbody").innerHTML = data.map(d => "<tr data-o=\"" + d.o + "\"" +
    (S.pin === d.o ? ' class="pin"' : "") + ">" + cols.map(c => {
      const v = get(d, c);
      if (v == null) return `<td class="na">—</td>`;
      return `<td>${c.num ? fmtValue(v, c.fmt) : esc(v)}</td>`;
    }).join("") + "</tr>").join("");

  $("table-cap").textContent = `${data.length.toLocaleString()} offices in ${YEARS[S.yi]}` +
    (S.state ? `, ${S.state}` : "") + (q ? `, matching "${S.search.trim()}"` : "") +
    ". Click a heading to sort, a row to select the office.";
}

/* --- Counties -------------------------------------------------------------
   The third tab works on a different spine from the first two: 2,842 counties on
   the 1900 map over 1880-1920, against 1,507 cities over 1896-1910. It therefore
   keeps its own year, state filter and selection in SC rather than sharing S —
   mirroring the controls would mean mapping two different year ranges and two
   different vocabularies of state name onto each other for no gain. */

const SC = {
  yi: 0, measure: "post_offices", state: "", perCap: false,
  ovRail: false, ovCity: true, hot: null,
  sx: "post_offices", sy: "patents", sxLog: true, syLog: true,
};

let CYEARS = [], CNY = 0, CN = 0, CFIPS = [], CVARS = [], CVAR = new Map(),
    CDATA = {}, CENSUS = [], CSTATES = [];

/* Arrays arrive either dense or as a fill value plus the positions that differ
   from it — lynchings are zero in 98% of county-years and every free-delivery
   measure is missing outside 1896-1910, so the sparse form saves several MB. */
function unpack(p) {
  if (p.d) return p.d;
  const a = new Array(p.n).fill(p.fill);
  for (let i = 0; i < p.i.length; i++) a[p.i[i]] = p.v[i];
  return a;
}

if (HAS_COUNTY) {
  CYEARS = CD.years; CNY = CYEARS.length;
  CFIPS = CD.counties.fips; CN = CFIPS.length;
  CVARS = CD.vars; CVAR = new Map(CVARS.map(v => [v.key, v]));
  CENSUS = CD.censusYears;
  for (const v of CVARS) CDATA[v.key] = unpack(CD.data[v.key]);
  CSTATES = Array.from(new Set(CD.counties.state)).sort();
  SC.yi = Math.max(0, CYEARS.indexOf(1900));
}

/* A census measure exists at five benchmarks only. Rather than interpolate it and
   invent a series, the map carries the most recent census at or before the year on
   the slider, and the caption says which one.

   "Most recent" has to mean most recent *that this measure was actually collected
   in*, not simply the latest benchmark passed. Manufacturing has no 1910 and
   incarceration has neither 1890 nor 1910, so taking the nearest benchmark blindly
   would blank the map for a whole decade while perfectly good earlier data sat
   unused. The measure's own coverage decides. */
function censusSlot(year, m) {
  let best = -1;
  for (let j = 0; j < CENSUS.length; j++) {
    if (CENSUS[j] > year) break;
    if (!m || (m.coverage[j] || 0) > 0) best = j;
  }
  if (best >= 0) return best;
  // Before the first census this measure exists in: show the earliest it has.
  for (let j = 0; j < CENSUS.length; j++) if (!m || (m.coverage[j] || 0) > 0) return j;
  return 0;
}

function cRaw(key, ci, yi) {
  const m = CVAR.get(key);
  if (!m) return null;
  const arr = CDATA[key];
  return m.annual ? arr[ci * CNY + yi]
                  : arr[ci * CENSUS.length + censusSlot(CYEARS[yi], m)];
}

/* Per-capita views are computed here rather than shipped, so a rate can never
   disagree with the count it came from. Only counts carry the `rate` flag. */
function cVal(ci, yi, key) {
  key = key || SC.measure;
  const m = CVAR.get(key);
  const v = cRaw(key, ci, yi);
  if (v == null || !isFinite(v)) return null;
  if (!SC.perCap || !m.rate) return v;
  const pop = cRaw("population_i", ci, yi);
  return pop > 0 ? 1e4 * v / pop : null;
}

const cLabel = key => {
  const m = CVAR.get(key);
  return m.label + (SC.perCap && m.rate ? " per 10,000" : "");
};
const cFmt = key => {
  const m = CVAR.get(key);
  return SC.perCap && m.rate ? "num" : m.fmt;
};

/* The state filter is a parameter rather than a read of SC, because the voting tab
   keeps its own state selection and shares this county geometry. Defaulting to
   SC.state leaves every existing caller unchanged. */
const cIn = (ci, state) => {
  const st = state === undefined ? SC.state : state;
  return !st || CD.counties.state[ci] === st;
};

/* --- County geometry ------------------------------------------------------- */

let CRINGS = null;
function countyRings() {
  if (CRINGS) return CRINGS;
  const k = 1 / CG.scale;
  CRINGS = CG.polys.map(polys => polys.map(ln => {
    const out = new Float64Array(ln.length);
    let x = ln[0], y = ln[1];
    out[0] = x * k; out[1] = y * k;
    for (let i = 2; i < ln.length; i += 2) {
      x += ln[i]; y += ln[i + 1];
      out[i] = x * k; out[i + 1] = y * k;
    }
    return out;
  }));
  return CRINGS;
}

const cviewCache = new Map();

/* Projecting 205,000 vertices is the expensive part of this tab, so it happens
   once per state frame and the path strings are reused for every year and every
   measure after that. */
function countyView(state) {
  const st = state === undefined ? SC.state : state;
  const key = st || "";
  if (cviewCache.has(key)) return cviewCache.get(key);

  const rings = countyRings();
  const idx = [];
  for (let ci = 0; ci < CN; ci++) if (cIn(ci, st) && rings[ci].length) idx.push(ci);
  const all = idx.flatMap(ci => rings[ci]);

  let proj, W = 975, H = 600;
  if (st) {
    const [lon0, lat0, lon1, lat1] = lonlatBounds(all), span = lat1 - lat0 || 1;
    proj = albers((lat0 + lat1) / 2, lat0 + span / 6, lat1 - span / 6, (lon0 + lon1) / 2);
    const [x0, y0, x1, y1] = projBounds(proj, all);
    const aspect = Math.max(1.25, Math.min(2.4, (x1 - x0) / (y1 - y0 || 1)));
    H = Math.round(W / aspect);
  } else {
    proj = albers(37.5, 29.5, 45.5, -96);
  }
  const fitted = fit(proj, all, [12, 10, W - 12, H - 10]);

  const paths = new Array(CN).fill("");
  for (const ci of idx) paths[ci] = rings[ci].map(r => ringPath(r, fitted)).join("");

  const V = { paths, idx, project: fitted, viewBox: `0 0 ${W} ${H}`,
              clip: idx.map(ci => paths[ci]) };
  cviewCache.set(key, V);
  return V;
}

/* --- County scales --------------------------------------------------------- */

function cScales(V) {
  const m = CVAR.get(SC.measure);
  const vals = [];
  for (const ci of V.idx) {
    const v = cVal(ci, SC.yi);
    if (v != null) vals.push(v);
  }
  vals.sort((a, b) => a - b);
  if (!vals.length) return { vals, of: () => CNONE, breaks: [], ramp: SEQ };

  let ramp = SEQ, breaks;
  if (m.diverging) {
    const mag = quantile(vals.map(Math.abs).sort((a, b) => a - b), 0.9) || 1;
    ramp = DIV;
    breaks = [-mag / 2, -mag / 8, mag / 8, mag / 2];
  } else {
    breaks = [0.2, 0.4, 0.6, 0.8].map(p => quantile(vals, p));
    // A measure that is zero across most counties collapses every break onto zero,
    // which paints the whole map one colour. Fall back to splitting the positive
    // tail so the map still separates "some" from "none".
    if (breaks[3] <= breaks[0]) {
      const pos = vals.filter(v => v > breaks[0]);
      breaks = pos.length >= 4
        ? [breaks[0], ...[0.34, 0.67, 1].map(p => quantile(pos, p))]
        : [breaks[0], breaks[0], breaks[0], vals[vals.length - 1]];
    }
  }
  const of = v => {
    if (v == null) return CNONE;
    let i = 0;
    while (i < breaks.length && v > breaks[i]) i++;
    return ramp[i];
  };
  return { vals, of, breaks, ramp };
}

/* --- County map ------------------------------------------------------------ */

function drawCountyMap() {
  const m = CVAR.get(SC.measure), V = countyView(), sc = cScales(V);
  const year = CYEARS[SC.yi];

  let body = "";
  for (const ci of V.idx) {
    const v = cVal(ci, SC.yi);
    body += `<path class="county${v == null ? " none" : ""}" data-c="${ci}" ` +
            `d="${V.paths[ci]}"${v == null ? "" : ` fill="${sc.of(v)}"`}/>`;
  }

  let over = "", railNote = "";
  if (SC.ovRail && R) {
    const P = railPaths("county:" + (SC.state || ""), V, "");
    // The bundle collapses everything running before 1896 into one bucket, so for
    // an earlier year the honest thing is to say so rather than draw a network
    // that did not exist yet.
    const shown = Math.min(year, CYEARS[CNY - 1]);
    const adds = P.adds.filter(a => a.year <= shown).map(a => a.d).join("");
    over += `<path class="rail rail-old" d="${P.base}"/>` +
            (adds ? `<path class="rail rail-new" d="${adds}"/>` : "");
    railNote = year < R.baseYear
      ? ` Rail is drawn as of ${R.baseYear}: the network bundle cannot separate vintages before then.`
      : ` Rail shows track in operation by ${R.baseYear} plus additions through ${shown}.`;
  }

  let nCity = 0;
  if (SC.ovCity) {
    // The office panel runs 1896-1910; outside it, the nearest year is drawn.
    const oy = Math.min(Math.max(year, YEARS[0]), YEARS[NY - 1]);
    const oyi = YEARS.indexOf(oy);
    let dots = "";
    for (const r of rowsByYear[oyi]) {
      const o = D.panel.o[r];
      const [x, y] = V.project(D.offices.lon[o], D.offices.lat[o]);
      if (x < -50 || y < -50) continue;
      dots += `<circle class="co-city" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.1"/>`;
      nCity++;
    }
    over += dots;
    if (oy !== year) railNote += ` Free-delivery cities are shown for ${oy}, the nearest year the office panel covers.`;
  }

  const clip = SC.state
    ? `<clipPath id="county-clip">${V.clip.map(d => `<path d="${d}"/>`).join("")}</clipPath>`
    : "";
  $("cmap").setAttribute("viewBox", V.viewBox);
  $("cmap").innerHTML = clip + body +
    (over ? `<g${SC.state ? ' clip-path="url(#county-clip)"' : ""}>${over}</g>` : "");

  const n = sc.vals.length;
  $("cmap-title").textContent = cLabel(SC.measure) +
    (SC.state ? ", " + SC.state : "") + ", " + year;
  $("cmap-cap").textContent =
    `${n.toLocaleString()} of ${V.idx.length.toLocaleString()} counties report it` +
    (m.annual ? "" : ` (census of ${CENSUS[censusSlot(year, m)]}, the most recent this measure was collected in)`) +
    "." + railNote + (nCity ? ` ${nCity.toLocaleString()} free-delivery cities drawn.` : "");

  countyLegend(sc, m);
}

function countyLegend(sc, m) {
  const fmt = cFmt(SC.measure);
  let s = `<div><div class="legend-lab">${esc(cLabel(SC.measure))}</div>` +
    `<div class="swatches">` +
    sc.ramp.map(c => `<span class="sw" style="background:${c}"></span>`).join("") +
    `</div><div class="sw-ticks"><span></span>` +
    sc.breaks.map(b => `<span>${fmtShort(b, fmt)}</span>`).join("") + `</div></div>`;
  s += `<div class="legend-item"><span class="sw" style="background:${CNONE}"></span>` +
       `Not reported</div>`;
  if (SC.ovCity)
    s += `<div class="legend-item"><svg width="14" height="14" style="width:14px">` +
         `<circle cx="7" cy="9" r="2.1" fill="none" stroke="${C2}" stroke-width="1.2"/></svg>` +
         `Free-delivery city</div>`;
  if (SC.ovRail && R)
    s += `<div><div class="legend-lab">Railroad track</div>` +
         `<div class="legend-item"><span class="rail-key old"></span>By ${R.baseYear}</div>` +
         `<div class="legend-item"><span class="rail-key new"></span>Added later</div></div>`;
  $("cmap-legend").innerHTML = s;
}

/* --- County coverage strip ------------------------------------------------- */

function drawCountyCoverage() {
  const m = CVAR.get(SC.measure);
  const W = 900, H = 52, top = 4, base = 36;
  const span = m.annual ? CYEARS : CENSUS;
  const bw = W / span.length, max = CN;
  let s = "";
  for (let i = 0; i < span.length; i++) {
    const cov = m.coverage[i] || 0;
    const hAll = (base - top), hVal = (cov / max) * (base - top);
    const x = i * bw + (m.annual ? 2 : 8);
    const w = bw - (m.annual ? 4 : 16);
    // Which slider position this column stands for: a census column covers every
    // year up to the next benchmark.
    const active = m.annual ? i === SC.yi : i === censusSlot(CYEARS[SC.yi], m);
    s += `<path d="${vBar(x, base, w, hAll, 0)}" fill="${COV_ALL}"/>`;
    if (cov) s += `<path d="${vBar(x, base, w, hVal, 0)}" fill="${active ? C1 : COV_OFF}"/>`;
    if (!m.annual || i % 5 === 0 || active)
      s += `<text class="mark-label" x="${x + w / 2}" y="${base + 13}" text-anchor="middle" ` +
           `fill="${active ? FG : INK3}">${span[i]}</text>`;
    if (active || cov === 0)
      s += `<text class="mark-label" x="${x + w / 2}" y="${base - hVal - 4}" text-anchor="middle" ` +
           `fill="${cov ? INK2 : COV_NONE}">${cov ? cov.toLocaleString() : "none"}</text>`;
  }
  $("c-coverage-svg").innerHTML = s;
  $("c-coverage-lab").innerHTML =
    `<b>Coverage</b> &mdash; counties reporting ${esc(m.label.toLowerCase())} ` +
    (m.annual ? "each year" : "at each census") +
    ` (shaded) against all ${CN.toLocaleString()} counties (grey).`;
  const note = $("c-note");
  note.hidden = !m.note;
  note.textContent = m.note || "";
}

/* --- Event time ------------------------------------------------------------
   Raw means by years since free delivery arrived. This is a description, not an
   estimate: adoption was triggered by crossing a population or receipts
   threshold, so the counties that adopt are the ones that were already growing,
   and the set of counties observed at a given event time changes with the
   horizon. Both caveats are stated in the caption and the footer. */

const EV_LO = -20, EV_HI = 20;

function drawCountyEvent() {
  const W = 460, H = 340, L = 58, RG = 14, T = 14, B = 46;
  const sums = new Map();
  let nCounty = 0;

  for (let ci = 0; ci < CN; ci++) {
    const fy = CD.counties.fdYear[ci];
    if (fy == null || !cIn(ci)) continue;
    let used = false;
    for (let yi = 0; yi < CNY; yi++) {
      const tau = CYEARS[yi] - fy;
      if (tau < EV_LO || tau > EV_HI) continue;
      const v = cVal(ci, yi);
      if (v == null) continue;
      let b = sums.get(tau);
      if (!b) sums.set(tau, b = { s: 0, s2: 0, n: 0 });
      b.s += v; b.s2 += v * v; b.n++;
      used = true;
    }
    if (used) nCounty++;
  }

  const pts = [];
  for (let tau = EV_LO; tau <= EV_HI; tau++) {
    const b = sums.get(tau);
    if (!b || !b.n) continue;
    const mean = b.s / b.n;
    const varr = Math.max(0, b.s2 / b.n - mean * mean);
    pts.push({ tau, mean, se: b.n > 1 ? Math.sqrt(varr / b.n) : 0, n: b.n });
  }

  if (pts.length < 3) {
    $("cevent").innerHTML = emptyNote(W, H);
    $("cevent-cap").textContent = "Too few treated counties report this measure.";
    return;
  }

  const lo = Math.min(0, ...pts.map(p => p.mean - p.se));
  const hi = Math.max(...pts.map(p => p.mean + p.se));
  const X = t => L + ((t - EV_LO) / (EV_HI - EV_LO)) * (W - L - RG);
  const Y = v => H - B - ((v - lo) / (hi - lo || 1)) * (H - T - B);

  let s = "";
  for (const t of niceTicks(lo, hi, 4))
    s += `<line class="grid-line" x1="${L}" x2="${W - RG}" y1="${Y(t)}" y2="${Y(t)}"/>` +
         `<text class="mark-label" x="${L - 6}" y="${Y(t) + 3}" text-anchor="end">${
           fmtShort(t, cFmt(SC.measure))}</text>`;
  for (const t of [-20, -10, 0, 10, 20])
    s += `<text class="mark-label" x="${X(t)}" y="${H - B + 15}" text-anchor="middle">${
      t > 0 ? "+" + t : t}</text>`;

  const band = pts.map(p => `${X(p.tau).toFixed(1)},${Y(p.mean + p.se).toFixed(1)}`).join(" ")
    + " " + pts.slice().reverse()
        .map(p => `${X(p.tau).toFixed(1)},${Y(p.mean - p.se).toFixed(1)}`).join(" ");
  s += `<polygon class="ev-band" points="${band}"/>`;
  s += `<path class="ev-line" d="${pts.map((p, i) =>
    (i ? "L" : "M") + X(p.tau).toFixed(1) + "," + Y(p.mean).toFixed(1)).join("")}"/>`;
  s += `<line class="ev-rule" x1="${X(0)}" x2="${X(0)}" y1="${T}" y2="${H - B}"/>`;
  s += `<text class="mark-label" x="${X(0) + 4}" y="${T + 10}">free delivery arrives</text>`;
  s += `<text class="ax-title" x="${(L + W - RG) / 2}" y="${H - 6}" text-anchor="middle">` +
       `Years since free city delivery began</text>`;
  s += `<text class="ax-title" transform="translate(14,${(T + H - B) / 2}) rotate(-90)" ` +
       `text-anchor="middle">${esc(cLabel(SC.measure))}, county mean</text>`;
  $("cevent").innerHTML = s;

  const at0 = pts.find(p => p.tau === 0);
  $("cevent-cap").textContent =
    `Mean across ${nCounty.toLocaleString()} counties that ever get free delivery` +
    (SC.state ? " in " + SC.state : "") +
    (at0 ? `; ${at0.n.toLocaleString()} of them are observed in the year it arrives` : "") +
    ". Shaded band is ±1 standard error. Adoption was triggered by crossing a " +
    "population or receipts threshold, so this is a description, not an event-study estimate.";
}

/* --- County scatter -------------------------------------------------------- */

function drawCountyScatter() {
  const W = 460, H = 340, L = 60, RG = 14, T = 12, B = 46;
  const pts = [];
  for (let ci = 0; ci < CN; ci++) {
    if (!cIn(ci)) continue;
    let a = cVal(ci, SC.yi, SC.sx), b = cVal(ci, SC.yi, SC.sy);
    if (a == null || b == null) continue;
    if (SC.sxLog) { if (a <= 0) continue; a = Math.log10(a); }
    if (SC.syLog) { if (b <= 0) continue; b = Math.log10(b); }
    pts.push({ a, b, ci });
  }
  if (pts.length < 2) {
    $("cscatter").innerHTML = emptyNote(W, H);
    $("cscatter-cap").textContent = "Too few counties report both.";
    clearFits("cfit-body", "cfit-foot");
    return;
  }

  const ax = pts.map(p => p.a), by = pts.map(p => p.b);
  const x0 = Math.min(...ax), x1 = Math.max(...ax);
  const y0 = Math.min(...by), y1 = Math.max(...by);
  const X = v => L + ((v - x0) / (x1 - x0 || 1)) * (W - L - RG);
  const Y = v => H - B - ((v - y0) / (y1 - y0 || 1)) * (H - T - B);

  let s = "";
  for (const t of niceTicks(y0, y1, 4))
    s += `<line class="grid-line" x1="${L}" x2="${W - RG}" y1="${Y(t)}" y2="${Y(t)}"/>` +
         `<text class="mark-label" x="${L - 6}" y="${Y(t) + 3}" text-anchor="end">${
           fmtShort(SC.syLog ? Math.pow(10, t) : t, cFmt(SC.sy))}</text>`;
  for (const t of niceTicks(x0, x1, 4))
    s += `<text class="mark-label" x="${X(t)}" y="${H - B + 15}" text-anchor="middle">${
      fmtShort(SC.sxLog ? Math.pow(10, t) : t, cFmt(SC.sx))}</text>`;

  for (const p of pts) {
    const treated = CD.counties.fdYear[p.ci] != null;
    s += `<circle class="county-dot" data-c="${p.ci}" cx="${X(p.a).toFixed(1)}" ` +
         `cy="${Y(p.b).toFixed(1)}" r="3" fill="${treated ? C2 : C1}" fill-opacity="0.45"/>`;
  }

  const CF = fitOverlay(pts, fdGroups(CD.counties.fdYear), X, Y, x0, x1, T, H - B);
  s += CF.svg;

  s += `<text class="ax-title" x="${(L + W - RG) / 2}" y="${H - 6}" text-anchor="middle">${
    esc(cLabel(SC.sx))}${SC.sxLog ? " (log scale)" : ""}</text>`;
  s += `<text class="ax-title" transform="translate(14,${(T + H - B) / 2}) rotate(-90)" ` +
       `text-anchor="middle">${esc(cLabel(SC.sy))}${SC.syLog ? " (log scale)" : ""}</text>`;
  $("cscatter").innerHTML = s;

  const ma = ax.reduce((t, v) => t + v, 0) / ax.length;
  const mb = by.reduce((t, v) => t + v, 0) / by.length;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < ax.length; i++) {
    sab += (ax[i] - ma) * (by[i] - mb); saa += (ax[i] - ma) ** 2; sbb += (by[i] - mb) ** 2;
  }
  const nT = pts.filter(p => CD.counties.fdYear[p.ci] != null).length;
  $("cscatter-cap").textContent =
    `${CYEARS[SC.yi]}: ${pts.length.toLocaleString()} counties report both, ` +
    `${nT.toLocaleString()} of them with free delivery (orange). ` +
    `Correlation as plotted ${(sab / Math.sqrt(saa * sbb)).toFixed(3)}.`;
  fitTable("cfit-body", "cfit-foot", CF.fits, logNote(SC.sxLog, SC.syLog));
}

/* --- Twenty largest counties ----------------------------------------------- */

function drawCountyTop() {
  const W = 975, H = 420, L = 210, RG = 70, T = 10, B = 8;
  const rows = [];
  for (let ci = 0; ci < CN; ci++) {
    if (!cIn(ci)) continue;
    const v = cVal(ci, SC.yi);
    if (v != null) rows.push({ ci, v });
  }
  rows.sort((a, b) => b.v - a.v);
  const top = rows.slice(0, 20);
  if (!top.length) {
    $("ctop").innerHTML = emptyNote(W, H);
    $("ctop-cap").textContent = "No county reports this measure in this year.";
    return;
  }

  const max = top[0].v || 1, bh = (H - T - B) / 20 - 4;
  let s = "";
  top.forEach((d, i) => {
    const y = T + i * ((H - T - B) / 20);
    const w = Math.max(0, (d.v / max) * (W - L - RG));
    s += `<text class="mark-label" x="${L - 8}" y="${y + bh - 2}" text-anchor="end">${
      esc(CD.counties.name[d.ci])}, ${esc(CD.counties.state[d.ci])}</text>`;
    s += `<path class="county-bar" data-c="${d.ci}" d="${hBar(L, y, Math.max(w, 1.5), bh, 0)}" ` +
         `fill="${CD.counties.fdYear[d.ci] != null ? C2 : C1}" fill-opacity="0.8"/>`;
    s += `<text class="mark-label" x="${L + Math.max(w, 1.5) + 6}" y="${y + bh - 2}">${
      fmtShort(d.v, cFmt(SC.measure))}</text>`;
  });
  $("ctop").innerHTML = s;
  $("ctop-title").textContent = "Twenty largest counties, " + CYEARS[SC.yi];
  $("ctop-cap").textContent = "By " + cLabel(SC.measure).toLowerCase() +
    (SC.state ? ", within " + SC.state : "") +
    ". Counties with free city delivery are drawn in orange.";
}

/* --- County facts and tooltip ---------------------------------------------- */

function drawCountyFacts(V) {
  let n = 0, total = 0, treated = 0;
  for (const ci of V.idx) {
    const v = cVal(ci, SC.yi);
    if (v != null) { n++; total += v; }
    const fy = CD.counties.fdYear[ci];
    if (fy != null && fy <= CYEARS[SC.yi]) treated++;
  }
  const m = CVAR.get(SC.measure);
  $("c-f-counties").textContent = V.idx.length.toLocaleString();
  $("c-f-report").textContent = n.toLocaleString();
  // Summing a ratio across counties would be meaningless, so those report a mean.
  const isLevel = m.fmt === "int" || m.fmt === "money";
  $("c-f-total").textContent = n
    ? fmtShort(isLevel && !SC.perCap ? total : total / n, cFmt(SC.measure)) +
      (isLevel && !SC.perCap ? "" : " (mean)")
    : "—";
  $("c-f-treated").textContent = treated.toLocaleString();
  $("c-year-now").textContent = CYEARS[SC.yi];
  $("c-year-n").textContent = V.idx.length.toLocaleString() + " counties" +
    (SC.state ? " in " + SC.state : "") + ", " + CYEARS[SC.yi];
}

function countyTip(ci) {
  const fy = CD.counties.fdYear[ci];
  const keys = [SC.measure, "post_offices", "patents", "lynchings", "inmates", "population_i"]
    .filter((k, i, a) => CVAR.has(k) && a.indexOf(k) === i);
  const rows = keys.map(k =>
    `<tr><td>${esc(cLabel(k))}</td><td>${fmtValue(cVal(ci, SC.yi, k), cFmt(k))}</td></tr>`).join("");
  return `<div class="t-name">${esc(CD.counties.name[ci])}</div>` +
    `<div class="t-sub">${esc(CD.counties.state[ci])} &middot; ${CYEARS[SC.yi]} &middot; ` +
    (fy == null ? "no free city delivery" : `free delivery from ${fy}`) +
    `</div><table>${rows}</table>`;
}

function highlightCounty(ci) {
  hlStyle.textContent = ci == null ? "" :
    `[data-c="${ci}"]{stroke:${FG}!important;stroke-width:1.4px!important}`;
}

function renderCounties() {
  const V = countyView();
  drawCountyCoverage();
  drawCountyMap();
  drawCountyEvent();
  drawCountyScatter();
  drawCountyTop();
  drawCountyFacts(V);
}

/* --- County wiring --------------------------------------------------------- */

function cVarOptions(selected) {
  const groups = [];
  for (const v of CVARS) {
    let g = groups.find(x => x.name === v.group);
    if (!g) groups.push(g = { name: v.group, items: [] });
    g.items.push(v);
  }
  return groups.map(g => `<optgroup label="${esc(g.name)}">` + g.items.map(v =>
    `<option value="${v.key}"${v.key === selected ? " selected" : ""}>${esc(v.label)}</option>`
  ).join("") + "</optgroup>").join("");
}

let cTimer = null, cPlaying = false;

function setCountyYear(i) {
  SC.yi = Math.max(0, Math.min(CNY - 1, i));
  $("c-year").value = SC.yi;
  renderCounties();
  writeHash();
}

/* The per-capita box only means something for a count; for a ratio or a share it
   is disabled rather than silently ignored. */
function syncPerCap() {
  const m = CVAR.get(SC.measure), box = $("c-percap");
  box.disabled = !m.rate;
  box.parentElement.style.opacity = m.rate ? "" : "0.45";
  box.parentElement.title = m.rate ? "" :
    `${m.label} is already a rate or a ratio, so dividing by population would not mean anything.`;
}

function initCounties() {
  $("c-measure").innerHTML = cVarOptions(SC.measure);
  $("c-sx").innerHTML = cVarOptions(SC.sx);
  $("c-sy").innerHTML = cVarOptions(SC.sy);
  $("c-state").innerHTML = `<option value="">All states</option>` +
    CSTATES.map(s => `<option value="${esc(s)}"${s === SC.state ? " selected" : ""}>${esc(s)}</option>`).join("");
  $("c-year").max = CNY - 1;
  $("c-year").value = SC.yi;
  $("c-percap").checked = SC.perCap;
  syncPerCap();

  $("c-year").addEventListener("input", e => setCountyYear(+e.target.value));
  $("c-play").addEventListener("click", () => {
    cPlaying = !cPlaying;
    $("c-play").classList.toggle("on", cPlaying);
    $("c-play").innerHTML = cPlaying ? "&#10073;&#10073; Pause" : "&#9654; Play";
    clearInterval(cTimer);
    if (cPlaying) cTimer = setInterval(() => setCountyYear((SC.yi + 1) % CNY), 700);
  });

  $("c-measure").addEventListener("change", e => {
    SC.measure = e.target.value;
    syncPerCap();
    renderCounties();
    writeHash();
  });
  $("c-state").addEventListener("change", e => {
    SC.state = e.target.value;
    renderCounties();
    writeHash();
  });
  $("c-percap").addEventListener("change", e => {
    SC.perCap = e.target.checked;
    renderCounties();
    writeHash();
  });
  for (const [id, key] of [["c-ov-rail", "ovRail"], ["c-ov-city", "ovCity"]])
    $(id).addEventListener("change", e => { SC[key] = e.target.checked; drawCountyMap(); });

  $("c-sx").addEventListener("change", e => { SC.sx = e.target.value; drawCountyScatter(); });
  $("c-sy").addEventListener("change", e => { SC.sy = e.target.value; drawCountyScatter(); });
  $("c-sx-log").addEventListener("change", e => { SC.sxLog = e.target.checked; drawCountyScatter(); });
  $("c-sy-log").addEventListener("change", e => { SC.syLog = e.target.checked; drawCountyScatter(); });

  // Counties carry data-c rather than data-o, so they need their own delegated
  // handlers; the office ones look for .mark and never see them.
  document.addEventListener("mouseover", ev => {
    const el = ev.target.closest("[data-c]");
    if (!el) return;
    const ci = +el.dataset.c;
    highlightCounty(ci);
    showTip(countyTip(ci), ev);
  });
  document.addEventListener("mousemove", ev => {
    if (tip.style.opacity == 1 && ev.target.closest("[data-c]")) showTip(tip.innerHTML, ev);
  });
  document.addEventListener("mouseout", ev => {
    if (ev.target.closest("[data-c]")) { highlightCounty(null); hideTip(); }
  });

  document.addEventListener("keydown", ev => {
    if (S.tab !== "counties") return;
    if (ev.target.tagName === "INPUT" || ev.target.tagName === "SELECT") return;
    if (ev.key === "ArrowRight") setCountyYear(SC.yi + 1);
    if (ev.key === "ArrowLeft") setCountyYear(SC.yi - 1);
  });
}

/* --- Voting tab ------------------------------------------------------------
   Eleven presidential elections, 1880-1920, one county vote share per party. The
   bundle is built to sit on the county tab's geometry: same 2,836 counties, same
   order as PO_CGEO, so countyView()'s projection cache is reused rather than a
   second copy of 205,000 vertices being projected. That reuse is only safe while
   the two orders agree, so it is checked rather than assumed — see HAS_VOTES. */

const SV = { yi: 0, measure: "share_radical_left", state: "", playing: false,
             spec: "twoway" };

let VYEARS = [], VNY = 0, VN = 0, VVARS = [], VVAR = new Map(),
    VDATA = {}, VSTATES = [], VREGS = {};

if (HAS_VOTES) {
  VYEARS = VT.years; VNY = VYEARS.length;
  VN = VT.counties.fips.length;
  VVARS = VT.vars; VVAR = new Map(VVARS.map(v => [v.key, v]));
  for (const v of VVARS) VDATA[v.key] = unpack(VT.data[v.key]);
  VSTATES = Array.from(new Set(VT.counties.state)).sort();
  VREGS = VT.regs || {};
  const i92 = VYEARS.indexOf(1892);
  SV.yi = i92 >= 0 ? i92 : 0;
  if (!VVAR.has(SV.measure)) SV.measure = VVARS.length ? VVARS[0].key : "";
}

const vIn = ci => !SV.state || VT.counties.state[ci] === SV.state;

function vVal(ci, yi, key) {
  const arr = VDATA[key || SV.measure];
  if (!arr) return null;
  const v = arr[ci * VNY + yi];
  return v == null || !isFinite(v) ? null : v;
}

const vLabel = key => (VVAR.get(key) || {}).label || key;
const vFmt = key => (VVAR.get(key) || {}).fmt || "num";

/* Quintile breaks on what is drawn, with the same collapse-onto-zero fallback the
   county tab uses: most minor parties are zero in most counties, and without it
   every break lands on zero and the map paints flat. */
function vScales(V) {
  const vals = [];
  for (const ci of V.idx) { const v = vVal(ci, SV.yi); if (v != null) vals.push(v); }
  vals.sort((a, b) => a - b);
  if (!vals.length) return { vals, of: () => CNONE, breaks: [], ramp: SEQ };

  let breaks = [0.2, 0.4, 0.6, 0.8].map(p => quantile(vals, p));
  if (breaks[3] <= breaks[0]) {
    const pos = vals.filter(v => v > breaks[0]);
    breaks = pos.length >= 4
      ? [breaks[0], ...[0.34, 0.67, 1].map(p => quantile(pos, p))]
      : [breaks[0], breaks[0], breaks[0], vals[vals.length - 1]];
  }
  const of = v => {
    if (v == null) return CNONE;
    let i = 0;
    while (i < breaks.length && v > breaks[i]) i++;
    return SEQ[i];
  };
  return { vals, of, breaks, ramp: SEQ };
}

function drawVoteMap() {
  const V = countyView(SV.state), sc = vScales(V), year = VYEARS[SV.yi];

  let body = "";
  for (const ci of V.idx) {
    const v = vVal(ci, SV.yi);
    body += `<path class="county${v == null ? " none" : ""}" data-v="${ci}" ` +
            `d="${V.paths[ci]}"${v == null ? "" : ` fill="${sc.of(v)}"`}/>`;
  }
  $("vmap").setAttribute("viewBox", V.viewBox);
  $("vmap").innerHTML = body;

  $("vmap-title").textContent =
    vLabel(SV.measure) + (SV.state ? ", " + SV.state : "") + ", " + year;
  $("vmap-cap").textContent =
    `${sc.vals.length.toLocaleString()} of ${V.idx.length.toLocaleString()} ` +
    `counties report a ${year} return.`;

  const fmt = vFmt(SV.measure);
  $("vmap-legend").innerHTML =
    `<div><div class="legend-lab">${esc(vLabel(SV.measure))}</div>` +
    `<div class="swatches">` +
    sc.ramp.map(c => `<span class="sw" style="background:${c}"></span>`).join("") +
    `</div><div class="sw-ticks"><span></span>` +
    sc.breaks.map(b => `<span>${fmtShort(b, fmt)}</span>`).join("") + `</div></div>` +
    `<div class="legend-item"><span class="sw" style="background:${CNONE}"></span>` +
    `No return</div>`;
}

function drawVoteCoverage() {
  const m = VVAR.get(SV.measure);
  const W = 900, base = 36, top = 4;
  const bw = W / VNY;
  let s = "";
  for (let i = 0; i < VNY; i++) {
    const cov = (m.coverage && m.coverage[i]) || 0;
    const hAll = base - top, hVal = (cov / Math.max(VN, 1)) * (base - top);
    const x = i * bw + 6, w = bw - 12, active = i === SV.yi;
    s += `<path d="${vBar(x, base, w, hAll, 0)}" fill="${COV_ALL}"/>`;
    if (cov) s += `<path d="${vBar(x, base, w, hVal, 0)}" fill="${active ? C1 : COV_OFF}"/>`;
    s += `<text class="mark-label" x="${x + w / 2}" y="${base + 13}" text-anchor="middle" ` +
         `fill="${active ? FG : INK3}">${VYEARS[i]}</text>`;
    if (active || cov === 0) {
      // Election returns are near-universal, so the bar runs the full height and a
      // count placed above it would collide with the label line. Once the bar is
      // tall enough, the count goes inside it.
      const outside = base - hVal - 4, inside = base - hVal + 12;
      const ty = outside < top + 8 ? inside : outside;
      const fill = outside < top + 8 ? BG : (cov ? INK2 : COV_NONE);
      s += `<text class="mark-label" x="${x + w / 2}" y="${ty}" text-anchor="middle" ` +
           `fill="${fill}">${cov ? cov.toLocaleString() : "none"}</text>`;
    }
  }
  $("v-coverage-svg").innerHTML = s;
  $("v-coverage-lab").innerHTML =
    `<b>Coverage</b> &mdash; counties with a return carrying ` +
    `${esc(vLabel(SV.measure).toLowerCase())} at each election (shaded) against all ` +
    `${VN.toLocaleString()} counties (grey).`;
  const note = $("v-note");
  note.hidden = !m.note;
  note.textContent = m.note || "";
}

/* Every party's national share across the eleven elections, vote-weighted. This is
   the chart that makes the party coding auditable at a glance: Populism has to
   spike in 1892 and vanish after fusion, the Socialists have to start at 1900. */
function drawVoteSeries() {
  const W = 460, H = 340, L = 44, RG = 96, T = 12, B = 30;
  const keys = VVARS.filter(v => v.group === "Insurgent left" ||
                                 v.group === "Other insurgents").map(v => v.key);
  if (!keys.length) { $("vseries").innerHTML = emptyNote(W, H); return; }

  const series = keys.map(k => ({
    key: k, label: vLabel(k),
    pts: VYEARS.map((_, yi) => {
      let num = 0, den = 0;
      for (let ci = 0; ci < VN; ci++) {
        if (!vIn(ci)) continue;
        const v = vVal(ci, yi, k), w = vVal(ci, yi, "total_votes");
        if (v == null || w == null) continue;
        num += v * w; den += w;
      }
      return den ? num / den : null;
    }),
  }));
  const hi = Math.max(...series.flatMap(s => s.pts.filter(v => v != null)), 0.01);
  const X = i => L + (i / Math.max(VNY - 1, 1)) * (W - L - RG);
  const Y = v => H - B - (v / hi) * (H - T - B);

  let s = "";
  for (const t of niceTicks(0, hi, 4))
    s += `<line class="grid-line" x1="${L}" x2="${W - RG}" y1="${Y(t)}" y2="${Y(t)}"/>` +
         `<text class="mark-label" x="${L - 6}" y="${Y(t) + 3}" text-anchor="end">${
           fmtShort(t, "pct")}</text>`;
  for (let i = 0; i < VNY; i += 2)
    s += `<text class="mark-label" x="${X(i)}" y="${H - 10}" text-anchor="middle">${
      VYEARS[i]}</text>`;

  const palette = [C1, C2, SEQ[4], SEQ[2], SEQ[3], SEQ[1], FG, INK2];
  const labels = [];
  let top = null;
  series.forEach((t, si) => {
    const col = palette[si % palette.length];
    let d = "", started = false, lastI = -1;
    t.pts.forEach((v, i) => {
      if (v == null) { started = false; return; }
      d += (started ? "L" : "M") + X(i).toFixed(1) + "," + Y(v).toFixed(1);
      started = true; lastI = i;
      if (top == null || v > top.v) top = { v, year: VYEARS[i], label: t.label };
    });
    if (!d) return;
    s += `<path d="${d}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round"/>`;

    /* A party that contested one election draws as a lone vertical spike, which
       reads as a rendering fault rather than as data. Marking the observed points
       where a series has no neighbour on either side makes it legible as what it
       is: a single election. */
    t.pts.forEach((v, i) => {
      if (v == null) return;
      const alone = (i === 0 || t.pts[i - 1] == null) &&
                    (i === VNY - 1 || t.pts[i + 1] == null);
      if (alone)
        s += `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="2.8" fill="${col}"/>`;
    });
    const peak = Math.max(...t.pts.filter(v => v != null));
    if (peak > hi * 0.06) labels.push({ y: Y(t.pts[lastI]), label: t.label, col });
  });

  /* Minor parties all end near zero, so their end-of-line labels land on top of one
     another. Push them apart from the bottom up before drawing. */
  labels.sort((a, b) => a.y - b.y);
  for (let i = labels.length - 2; i >= 0; i--)
    if (labels[i + 1].y - labels[i].y < 11) labels[i].y = labels[i + 1].y - 11;
  for (const l of labels)
    s += `<text class="mark-label" x="${W - RG + 6}" y="${(l.y + 3).toFixed(1)}" ` +
         `fill="${l.col}">${esc(l.label)}</text>`;

  $("vseries").innerHTML = s;
  $("vseries-cap").textContent =
    `Vote-weighted share of the county vote${SV.state ? " in " + SV.state : ""}, ` +
    `by party and election. The scale is set by the tallest line` +
    (top ? `, ${top.label} at ${(100 * top.v).toFixed(1)}% in ${top.year}` : "") +
    `, so the smaller parties sit low. A dot marks a party that contested only ` +
    `that one election; a gap means the source carries no column for it, which is ` +
    `not the same as no votes.`;
}

/* Postal density against the selected measure, for the election on the slider. */
function drawVoteScatter() {
  const W = 460, H = 340, L = 56, RG = 14, T = 12, B = 40;
  const pts = [];
  for (let ci = 0; ci < VN; ci++) {
    if (!vIn(ci)) continue;
    const a = vVal(ci, SV.yi, "po_p10k"), b = vVal(ci, SV.yi, SV.measure);
    if (a == null || b == null) continue;
    pts.push({ ci, a, b });
  }
  if (pts.length < 3) {
    $("vscatter").innerHTML = emptyNote(W, H);
    $("vscatter-cap").textContent = "Too few counties report both.";
    clearFits("vfit-body", "vfit-foot");
    return;
  }
  const ax = pts.map(p => p.a), by = pts.map(p => p.b);
  const a0 = Math.min(...ax), a1 = Math.max(...ax);
  const b0 = Math.min(...by), b1 = Math.max(...by);
  const X = v => L + ((v - a0) / (a1 - a0 || 1)) * (W - L - RG);
  const Y = v => H - B - ((v - b0) / (b1 - b0 || 1)) * (H - T - B);

  let s = "";
  for (const t of niceTicks(b0, b1, 4))
    s += `<line class="grid-line" x1="${L}" x2="${W - RG}" y1="${Y(t)}" y2="${Y(t)}"/>` +
         `<text class="mark-label" x="${L - 6}" y="${Y(t) + 3}" text-anchor="end">${
           fmtShort(t, vFmt(SV.measure))}</text>`;
  for (const t of niceTicks(a0, a1, 4))
    s += `<text class="mark-label" x="${X(t)}" y="${H - B + 14}" text-anchor="middle">${
      fmtShort(t, "num")}</text>`;
  for (const p of pts) {
    const treated = VT.counties.fdYear[p.ci] != null;
    s += `<circle class="county-dot" data-v="${p.ci}" cx="${X(p.a).toFixed(1)}" ` +
         `cy="${Y(p.b).toFixed(1)}" r="2.6" fill="${treated ? C2 : C1}" fill-opacity="0.4"/>`;
  }

  const VF = fitOverlay(pts, fdGroups(VT.counties.fdYear), X, Y, a0, a1, T, H - B);
  s += VF.svg;

  s += `<text class="ax-title" x="${(L + W - RG) / 2}" y="${H - 6}" text-anchor="middle">` +
       `Post offices per 10,000 people</text>`;
  s += `<text class="ax-title" transform="translate(14,${(T + H - B) / 2}) rotate(-90)" ` +
       `text-anchor="middle">${esc(vLabel(SV.measure))}</text>`;
  $("vscatter").innerHTML = s;

  const ma = ax.reduce((t, v) => t + v, 0) / ax.length;
  const mb = by.reduce((t, v) => t + v, 0) / by.length;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < ax.length; i++) {
    sab += (ax[i] - ma) * (by[i] - mb); saa += (ax[i] - ma) ** 2; sbb += (by[i] - mb) ** 2;
  }
  const rho = saa && sbb ? sab / Math.sqrt(saa * sbb) : NaN;
  $("vscatter-cap").textContent =
    `${VYEARS[SV.yi]}: ${pts.length.toLocaleString()} counties report both; ` +
    `orange ever adopted free city delivery. Correlation as plotted ` +
    `${isFinite(rho) ? rho.toFixed(3) : "—"} — a raw correlation across counties, ` +
    `with none of the fixed effects the table below applies.`;
  fitTable("vfit-body", "vfit-foot", VF.fits, "");
}

/* The regression table. Every number here is read from the bundle, which
   j_vote_regs wrote — the page estimates nothing, so a figure on screen always
   traces to a row in output/tabs/. */
/* The specifications j_vote_regs estimates, in the order they are worth reading:
   the workhorse first, then the two that qualify it. Each is a block in the bundle
   with identical shape, so one renderer serves all of them — and each corresponds
   to a printed fragment, named here so the card can say which. */
const VSPECS = [
  { key: "twoway", label: "County and year fixed effects", tex: ["j_table1", "j_table2"],
    note: "The workhorse. The county effect absorbs how radical a place simply was, " +
          "the year effect what was happening nationally." },
  { key: "spatial", label: "Own and neighbours' postal density", tex: ["j_table4"],
    note: "Adds the queen-contiguity neighbours' postal density beside a county's " +
          "own, so a local association is not read off a regional one." },
  { key: "fdmargin", label: "Free city delivery margin, 1896–1910", tex: ["j_table3"],
    note: "The second treatment margin, on the years it is observed. The weaker " +
          "test: free city delivery is urban by construction and was triggered by " +
          "crossing a population or receipts threshold." },
];

const specRows = key => (VREGS[key] || []);

function drawVoteRegs() {
  const card = $("v-reg-card");
  const live = VSPECS.filter(s => specRows(s.key).length);
  if (!live.length) { card.hidden = true; return; }
  if (!live.some(s => s.key === SV.spec)) SV.spec = live[0].key;

  const spec = live.find(s => s.key === SV.spec);
  const rows = specRows(spec.key);
  card.hidden = false;

  if ($("v-spec").options.length !== live.length)
    $("v-spec").innerHTML = live.map(s =>
      `<option value="${s.key}">${esc(s.label)}</option>`).join("");
  $("v-spec").value = SV.spec;

  const coefNames = [];
  for (const r of rows) for (const c of r.coefs)
    if (!coefNames.includes(c.name)) coefNames.push(c.name);
  const labelOf = n => {
    for (const r of rows) for (const c of r.coefs) if (c.name === n) return c.label;
    return n;
  };
  $("vreg").querySelector("thead").innerHTML = "<tr><th>Outcome</th>" +
    coefNames.map(n => `<th>${esc(labelOf(n))}</th>`).join("") +
    "<th>N</th><th>Counties</th><th>Within R&sup2;</th></tr>";

  $("vreg").querySelector("tbody").innerHTML = rows.map(r => {
    const cells = coefNames.map(n => {
      const c = r.coefs.find(x => x.name === n);
      if (!c) return `<td class="na">—</td>`;
      return `<td>${c.beta.toFixed(4)}${star(c.p)}<span class="se"> (${
        c.se.toFixed(4)})</span></td>`;
    }).join("");
    /* The table reports every outcome at once, which is the point of it — but the
       selector above picks one, and a reader who has just chosen Socialist should
       be able to find the Socialist row without counting down the column. */
    const on = r.outcome === SV.measure ? ' class="sel"' : "";
    return `<tr${on}><td>${esc(r.label)}</td>${cells}<td>${r.n.toLocaleString()}</td>` +
           `<td>${r.counties.toLocaleString()}</td><td>${r.r2_within.toFixed(3)}</td></tr>`;
  }).join("");

  const first = rows[0];
  const picked = rows.find(r => r.outcome === SV.measure);
  $("vreg-cap").textContent =
    `${spec.note} Dependent variable is the county share of the presidential vote. ` +
    `Fixed effects: ${first.fe}. Standard errors in parentheses, clustered on ` +
    `${first.cluster}. *** p<0.01, ** p<0.05, * p<0.10. ` +
    (picked ? `${picked.label} is highlighted — it is the measure selected above.`
            : `The measure selected above has no row here; it is a treatment or a ` +
              `context series, not one of the vote outcomes.`);
  $("vreg-foot").textContent =
    "These are conditional correlations, not causal estimates: post offices went " +
    "where people were, and free city delivery was triggered by crossing a " +
    "population or receipts threshold. Printed as " +
    spec.tex.map(t => `output/tabs/${t}.tex`).join(" and ") + ".";
}

/* The event study for whichever measure the selector is on. j_vote_regs runs one
   per outcome and keys them by column name, so picking Socialist on the map puts
   the Socialist path under it rather than leaving the radical-left aggregate up
   with someone else's label. Older bundles shipped a bare array for the headline
   alone; that shape is still read, so the page does not break against them. */
function voteEvent(key) {
  const E = VREGS.event;
  if (!E) return null;
  if (Array.isArray(E))
    return key === VREGS.headline
      ? { label: VREGS.headlineLabel, rows: E, n: 0 } : null;
  const hit = E[key];
  return hit && hit.rows && hit.rows.length ? hit : null;
}

/* The chart's own numbers, term by term — the shape j_table5 prints for the
   headline, drawn here for whichever outcome is selected. The estimates come
   straight out of the bundle, so this and the curve above cannot disagree. */
function drawVoteEventTable(block) {
  const t = $("vev");
  if (!block) { t.hidden = true; $("vev-foot").textContent = ""; return; }
  t.hidden = false;

  t.querySelector("thead").innerHTML =
    "<tr><th>Elections since arrival</th><th>Coefficient</th><th>Std. error</th></tr>";
  t.querySelector("tbody").innerHTML = block.rows.slice()
    .sort((a, b) => a.tau - b.tau).map(r => {
      const omitted = r.tau === -1;
      return `<tr${omitted ? ' class="omit"' : ""}>` +
        `<td>${r.tau > 0 ? "+" + r.tau : r.tau}</td>` +
        `<td>${omitted ? "0.0000" : r.beta.toFixed(4) +
          (r.p == null ? "" : star(r.p))}</td>` +
        `<td class="se">${omitted ? "(omitted)" : "(" + r.se.toFixed(4) + ")"}</td></tr>`;
    }).join("");

  $("vev-foot").textContent =
    `${block.label}${block.n ? `, N = ${block.n.toLocaleString()}` : ""}. ` +
    `*** p<0.01, ** p<0.05, * p<0.10. The headline is printed as ` +
    `output/tabs/j_table5.tex and every outcome's post-adoption path as ` +
    `output/tabs/j_table7.tex.`;
}

/* Event study around the arrival of free city delivery, on election spacing. */
function drawVoteEvent() {
  const W = 975, H = 300, L = 64, RG = 16, T = 14, B = 34;
  const card = $("v-event-card");

  /* No event block at all means the bundle carries no regressions — j_vote_regs
     has not been run. That is the pre-existing "hide the card" case, and it is not
     the same as a bundle that has event studies but none for this measure, which
     is worth saying out loud. */
  const E = VREGS.event;
  if (!E || (Array.isArray(E) ? !E.length : !Object.keys(E).length)) {
    card.hidden = true;
    return;
  }
  card.hidden = false;

  const block = voteEvent(SV.measure);
  if (!block) {
    /* Every outcome that could be estimated was; the ones that cannot are the
       postal and population measures, where an event study of the treatment on
       itself says nothing, and the party series too thin to identify the tau
       dummies. Say which, rather than silently showing the previous party. */
    $("vevent").innerHTML = emptyNote(W, H);
    drawVoteEventTable(null);
    $("vevent-cap").textContent =
      `No event study for ${vLabel(SV.measure)}. The chart follows the measure ` +
      `above, and is estimated for the vote-share outcomes only — a postal or ` +
      `population measure is the treatment, not an outcome, and a party the ` +
      `source barely separates cannot identify the event-time dummies. ` +
      (VREGS.headlineLabel ? `Pick ${VREGS.headlineLabel} to see the headline.` : "");
    return;
  }

  const ev = block.rows.slice().sort((a, b) => a.tau - b.tau);
  if (ev.length < 2) { card.hidden = true; return; }
  drawVoteEventTable(block);

  const lo = Math.min(...ev.map(d => d.beta - 1.96 * d.se));
  const hi = Math.max(...ev.map(d => d.beta + 1.96 * d.se));
  const X = t => L + ((t - ev[0].tau) / Math.max(ev[ev.length - 1].tau - ev[0].tau, 1)) *
                 (W - L - RG);
  const Y = v => H - B - ((v - lo) / (hi - lo || 1)) * (H - T - B);

  let s = "";
  for (const t of niceTicks(lo, hi, 5))
    s += `<line class="grid-line" x1="${L}" x2="${W - RG}" y1="${Y(t)}" y2="${Y(t)}"/>` +
         `<text class="mark-label" x="${L - 6}" y="${Y(t) + 3}" text-anchor="end">${
           (t * 100).toFixed(1)}</text>`;
  s += `<line class="ev-rule" x1="${L}" x2="${W - RG}" y1="${Y(0)}" y2="${Y(0)}"/>`;
  s += `<line class="ev-rule" x1="${X(-0.5)}" x2="${X(-0.5)}" y1="${T}" y2="${H - B}" ` +
       `stroke-dasharray="3 3"/>`;

  const band = ev.map(d => `${X(d.tau).toFixed(1)},${Y(d.beta + 1.96 * d.se).toFixed(1)}`)
    .concat(ev.slice().reverse().map(d =>
      `${X(d.tau).toFixed(1)},${Y(d.beta - 1.96 * d.se).toFixed(1)}`)).join(" ");
  s += `<polygon class="ev-band" points="${band}" fill="${C1}" fill-opacity="0.16"/>`;
  s += `<path class="ev-line" d="${ev.map((d, i) =>
    (i ? "L" : "M") + X(d.tau).toFixed(1) + "," + Y(d.beta).toFixed(1)).join("")}" ` +
    `fill="none" stroke="${C1}" stroke-width="2"/>`;
  for (const d of ev)
    s += `<circle cx="${X(d.tau).toFixed(1)}" cy="${Y(d.beta).toFixed(1)}" r="3" fill="${C1}"/>`;
  for (const d of ev)
    s += `<text class="mark-label" x="${X(d.tau)}" y="${H - 12}" text-anchor="middle">${
      d.tau > 0 ? "+" + d.tau : d.tau}</text>`;
  s += `<text class="ax-title" transform="translate(16,${(T + H - B) / 2}) rotate(-90)" ` +
       `text-anchor="middle">Percentage points</text>`;
  $("vevent").innerHTML = s;
  $("vevent-cap").textContent =
    `${block.label || vLabel(SV.measure)} share against elections since free ` +
    `city delivery arrived, with county and year fixed effects` +
    (block.n ? `, on ${block.n.toLocaleString()} county-elections` : "") +
    `. The election before arrival is the omitted category, so every point reads ` +
    `against it; the band is 95%. Adoption was threshold-triggered, so read the ` +
    `pre-period as a check on comparability rather than the post-period as an ` +
    `effect. Post-adoption coefficients for every outcome are in ` +
    `output/tabs/j_table7.tex.`;
}

function drawVoteFacts() {
  let n = 0, num = 0, den = 0, best = null, votes = 0;
  for (let ci = 0; ci < VN; ci++) {
    if (!vIn(ci)) continue;
    const v = vVal(ci, SV.yi), w = vVal(ci, SV.yi, "total_votes");
    if (v == null) continue;
    n++;
    if (w != null) { num += v * w; den += w; votes += w; }
    if (best == null || v > best.v) best = { v, ci };
  }
  const fmt = vFmt(SV.measure);
  $("v-f-counties").textContent = n.toLocaleString();
  $("v-f-share").textContent = den ? fmtValue(num / den, fmt) : "—";
  $("v-f-max").textContent = best
    ? `${fmtValue(best.v, fmt)} · ${VT.counties.name[best.ci]}` : "—";
  $("v-f-votes").textContent = votes ? fmtShort(votes, "int") : "—";
}

function renderVotes() {
  drawVoteCoverage();
  drawVoteMap();
  drawVoteSeries();
  drawVoteScatter();
  drawVoteRegs();
  drawVoteEvent();
  drawVoteFacts();
  $("v-year-now").textContent = VYEARS[SV.yi];
  $("v-year-n").textContent = `election ${SV.yi + 1} of ${VNY}`;
}

/* --- Voting wiring --------------------------------------------------------- */

function vVarOptions(selected) {
  const groups = [];
  for (const v of VVARS) {
    let g = groups.find(x => x.name === v.group);
    if (!g) groups.push(g = { name: v.group, items: [] });
    g.items.push(v);
  }
  return groups.map(g => `<optgroup label="${esc(g.name)}">` + g.items.map(v =>
    `<option value="${v.key}"${v.key === selected ? " selected" : ""}>${esc(v.label)}</option>`
  ).join("") + "</optgroup>").join("");
}

let vTimer = null;

function setVoteYear(i) {
  SV.yi = Math.max(0, Math.min(VNY - 1, i));
  $("v-year").value = SV.yi;
  renderVotes();
  writeHash();
}

function voteTip(ci) {
  const keys = [SV.measure, "share_radical_left", "share_thirdparty", "turnout",
                "po_p10k"].filter((k, i, a) => VVAR.has(k) && a.indexOf(k) === i);
  const rows = keys.map(k =>
    `<tr><td>${esc(vLabel(k))}</td><td>${fmtValue(vVal(ci, SV.yi, k), vFmt(k))}</td></tr>`
  ).join("");
  const fd = VT.counties.fdYear[ci];
  return `<div class="t-name">${esc(VT.counties.name[ci])}, ${
    esc(VT.counties.state[ci])}</div>` +
    `<div class="t-sub">${VYEARS[SV.yi]} &middot; ${
      fd == null ? "no free city delivery" : "free delivery from " + fd}</div>` +
    `<table>${rows}</table>`;
}

/* Shares the one hlStyle element with the other tabs rather than adding a second. */
function highlightVote(ci) {
  hlStyle.textContent = ci == null ? "" :
    `[data-v="${ci}"]{stroke:${FG}!important;stroke-width:1.6px!important}`;
}

function initVotes() {
  $("v-measure").innerHTML = vVarOptions(SV.measure);
  $("v-state").innerHTML = `<option value="">All states</option>` +
    VSTATES.map(s => `<option value="${esc(s)}"${s === SV.state ? " selected" : ""}>${
      esc(s)}</option>`).join("");
  $("v-year").max = String(VNY - 1);
  $("v-year").value = SV.yi;

  $("v-measure").addEventListener("change", e => {
    SV.measure = e.target.value; renderVotes(); writeHash();
  });
  $("v-state").addEventListener("change", e => {
    SV.state = e.target.value; renderVotes(); writeHash();
  });
  /* Only the regression card depends on the specification, so it alone redraws —
     nothing about the map or the scatter changes when the margin does. */
  $("v-spec").addEventListener("change", e => {
    SV.spec = e.target.value; drawVoteRegs();
  });
  $("v-year").addEventListener("input", e => setVoteYear(+e.target.value));
  $("v-play").addEventListener("click", () => {
    SV.playing = !SV.playing;
    $("v-play").textContent = SV.playing ? "■ Stop" : "▶ Play";
    clearInterval(vTimer);
    if (SV.playing) vTimer = setInterval(() => setVoteYear((SV.yi + 1) % VNY), 900);
  });

  // Votes carry data-v, so they need their own delegated handlers: the county
  // handlers look for data-c and would otherwise answer with county measures.
  document.addEventListener("mouseover", ev => {
    const el = ev.target.closest("[data-v]");
    if (!el) return;
    const ci = +el.dataset.v;
    highlightVote(ci);
    showTip(voteTip(ci), ev);
  });
  document.addEventListener("mousemove", ev => {
    if (tip.style.opacity == 1 && ev.target.closest("[data-v]")) showTip(tip.innerHTML, ev);
  });
  document.addEventListener("mouseout", ev => {
    if (ev.target.closest("[data-v]")) { highlightVote(null); hideTip(); }
  });
  document.addEventListener("keydown", ev => {
    if (S.tab !== "votes") return;
    if (ev.target.tagName === "INPUT" || ev.target.tagName === "SELECT") return;
    if (ev.key === "ArrowRight") setVoteYear(SV.yi + 1);
    if (ev.key === "ArrowLeft") setVoteYear(SV.yi - 1);
  });
}

/* --- URL state ------------------------------------------------------------
   The current view lives in the hash, so a particular year-and-measure reading
   can be bookmarked or passed to someone else. */

const HASH_KEYS = ["size", "color", "state", "sx", "sy"];
let hashWritable = true;

function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.has("year")) {
    const i = YEARS.indexOf(+h.get("year"));
    if (i >= 0) S.yi = i;
  }
  for (const k of HASH_KEYS) if (h.has(k)) S[k] = h.get(k);
  for (const k of ["sxLog", "syLog", "hideMissing"]) if (h.has(k)) S[k] = h.get(k) === "1";
  if (h.has("pin")) {
    const i = D.offices.id.indexOf(+h.get("pin"));
    if (i >= 0) S.pin = i;
  }
  if (h.get("tab") === "rail" && R) S.tab = "rail";
  if (h.get("tab") === "counties" && HAS_COUNTY) S.tab = "counties";
  if (h.get("tab") === "votes" && HAS_VOTES) S.tab = "votes";
  if (HAS_VOTES) {
    if (h.has("vyear")) {
      const i = VYEARS.indexOf(+h.get("vyear"));
      if (i >= 0) SV.yi = i;
    }
    if (h.has("vmeasure")) SV.measure = h.get("vmeasure");
    if (h.has("vstate")) SV.state = h.get("vstate");
    if (!VVAR.has(SV.measure)) SV.measure = VVARS.length ? VVARS[0].key : "";
    if (SV.state && !VSTATES.includes(SV.state)) SV.state = "";
  }
  if (HAS_COUNTY) {
    if (h.has("cyear")) {
      const i = CYEARS.indexOf(+h.get("cyear"));
      if (i >= 0) SC.yi = i;
    }
    for (const k of ["measure", "sx", "sy"])
      if (h.has("c" + k)) SC[k] = h.get("c" + k);
    if (h.has("cstate")) SC.state = h.get("cstate");
    if (h.has("cpercap")) SC.perCap = h.get("cpercap") === "1";
    if (!CVAR.has(SC.measure)) SC.measure = "post_offices";
    if (!CVAR.has(SC.sx)) SC.sx = "post_offices";
    if (!CVAR.has(SC.sy)) SC.sy = "patents";
    if (SC.state && !CSTATES.includes(SC.state)) SC.state = "";
  }
  if (!VAR.has(S.size)) S.size = "Receipts";
  if (S.color && !VAR.has(S.color)) S.color = "";
  if (!VAR.has(S.sx)) S.sx = "Receipts";
  if (!VAR.has(S.sy)) S.sy = "Cost";
  if (S.state && !STATES.includes(S.state)) S.state = "";
}

function writeHash() {
  const h = new URLSearchParams();
  h.set("year", YEARS[S.yi]);
  if (S.tab !== "explorer") h.set("tab", S.tab);
  for (const k of HASH_KEYS) if (S[k]) h.set(k, S[k]);
  if (S.hideMissing) h.set("hideMissing", "1");
  if (!S.sxLog) h.set("sxLog", "0");
  if (!S.syLog) h.set("syLog", "0");
  if (S.pin != null) h.set("pin", D.offices.id[S.pin]);
  if (S.tab === "counties") {
    h.set("cyear", CYEARS[SC.yi]);
    h.set("cmeasure", SC.measure);
    if (SC.state) h.set("cstate", SC.state);
    if (SC.perCap) h.set("cpercap", "1");
  }
  if (S.tab === "votes") {
    h.set("vyear", VYEARS[SV.yi]);
    h.set("vmeasure", SV.measure);
    if (SV.state) h.set("vstate", SV.state);
  }
  // Chrome rejects replaceState from a file:// document (its origin is null), so
  // the hash stays readable on load but is not written back there.
  if (hashWritable) {
    try { history.replaceState(null, "", "#" + h.toString()); }
    catch (e) { hashWritable = false; }
  }
}

/* --- Render ---------------------------------------------------------------- */

function render() {
  writeHash();

  // The county tab shares no scale or selection with the other two, so it renders
  // on its own and the office slice is never computed for it.
  if (S.tab === "counties") { renderCounties(); return; }
  if (S.tab === "votes") { renderVotes(); return; }

  const rows = slice(), sc = scales(rows);

  // Only the visible tab is drawn; the others are redrawn when they are opened.
  if (S.tab === "rail") {
    drawRailMap(rows, sc);
  } else {
    drawCoverage();
    drawMap(rows, sc);
    drawSeries();
    drawHist(rows);
    drawTop(rows);
    drawScatter();
    drawDetail();
    drawTable(rows);
  }

  const caption = rows.length.toLocaleString() + " offices in the panel" +
    (S.state ? " in " + S.state : "");
  for (const p of ["", "r-"]) {
    const now = $(p + "year-now");
    if (!now) continue;
    now.textContent = YEARS[S.yi];
    $(p + "year-n").textContent = caption;
  }
}

/* --- Wiring ---------------------------------------------------------------- */

function varOptions(selected, allowNone) {
  const groups = [];
  for (const v of VARS) {
    let g = groups.find(x => x.name === v.group);
    if (!g) groups.push(g = { name: v.group, items: [] });
    g.items.push(v);
  }
  return (allowNone ? `<option value=""${selected ? "" : " selected"}>None</option>` : "") +
    groups.map(g => `<optgroup label="${esc(g.name)}">` + g.items.map(v =>
      `<option value="${v.key}"${v.key === selected ? " selected" : ""}>${esc(v.label)}</option>`
    ).join("") + "</optgroup>").join("");
}

/* Both tabs carry the same controls over one shared selection, so every control
   is wired on both and every write is mirrored to both. */
const PREFIXES = ["", "r-"];
const each = (id, fn) => { for (const p of PREFIXES) { const el = $(p + id); if (el) fn(el); } };
const on = (id, ev, fn) => each(id, el => el.addEventListener(ev, fn));

function setYear(i) {
  S.yi = i;
  each("year", el => { el.value = i; });
  render();
}

/* Tabs, and whether their data arrived. A tab whose bundle is missing is hidden
   rather than left to fail, so the page still works from a partial build. */
const TABS = [
  { name: "explorer", ok: () => true },
  { name: "rail", ok: () => !!R },
  { name: "counties", ok: () => HAS_COUNTY },
  { name: "votes", ok: () => HAS_VOTES },
];

function setTab(name) {
  const t = TABS.find(t => t.name === name && t.ok());
  S.tab = t ? t.name : "explorer";
  for (const { name: n } of TABS) {
    const panel = $("tab-" + n), btn = $("tab-btn-" + n);
    if (panel) panel.hidden = S.tab !== n;
    if (btn) btn.classList.toggle("on", S.tab === n);
  }
  render();
}

function init() {
  readTokens();
  readHash();

  // Switching theme only needs the ramps re-read and the open tab redrawn: the
  // cached projections and rail paths are geometry and carry no colour, and the
  // other tab is redrawn by setTab when it is opened.
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    readTokens();
    render();
  });

  $("f-offices").textContent = NO.toLocaleString();
  $("f-rows").textContent = NR.toLocaleString();
  $("f-years").textContent = YEARS[0] + "–" + YEARS[NY - 1];
  $("f-growth").textContent = D.counts[0].toLocaleString() + " → " + D.counts[NY - 1].toLocaleString();

  const stateOptions = `<option value="">All states</option>` +
    STATES.map(s => `<option value="${esc(s)}"${s === S.state ? " selected" : ""}>${esc(s)}</option>`).join("");
  each("size-var", el => { el.innerHTML = varOptions(S.size, false); });
  each("color-var", el => { el.innerHTML = varOptions(S.color, true); });
  each("state-filter", el => { el.innerHTML = stateOptions; });
  each("hide-missing", el => { el.checked = S.hideMissing; });
  each("year", el => { el.max = NY - 1; el.value = S.yi; });
  $("sx").innerHTML = varOptions(S.sx, false);
  $("sy").innerHTML = varOptions(S.sy, false);
  $("sx-log").checked = S.sxLog;
  $("sy-log").checked = S.syLog;

  for (const t of TABS) {
    const b = $("tab-btn-" + t.name);
    if (!b) continue;
    if (!t.ok()) { b.hidden = true; continue; }
    b.addEventListener("click", () => setTab(t.name));
  }
  if (HAS_COUNTY) initCounties();
  if (HAS_VOTES) initVotes();
  drawTables();

  on("year", "input", e => setYear(+e.target.value));
  on("play", "click", togglePlay);
  document.addEventListener("keydown", ev => {
    if (S.tab === "counties") return;      // that tab runs its own year
    if (ev.target.tagName === "INPUT" || ev.target.tagName === "SELECT") return;
    if (ev.key === "ArrowRight" && S.yi < NY - 1) setYear(S.yi + 1);
    if (ev.key === "ArrowLeft" && S.yi > 0) setYear(S.yi - 1);
  });

  const sync = (id, prop, apply) => on(id, "change", e => {
    each(id, el => { el[prop] = e.target[prop]; });
    apply(e.target[prop]);
    render();
  });
  sync("size-var", "value", v => { S.size = v; S.sortCol = null; });
  sync("color-var", "value", v => { S.color = v; });
  sync("state-filter", "value", v => { S.state = v; });
  sync("hide-missing", "checked", v => { S.hideMissing = v; });

  $("sx").addEventListener("change", e => { S.sx = e.target.value; drawScatter(); });
  $("sy").addEventListener("change", e => { S.sy = e.target.value; drawScatter(); });
  $("sx-log").addEventListener("change", e => { S.sxLog = e.target.checked; drawScatter(); });
  $("sy-log").addEventListener("change", e => { S.syLog = e.target.checked; drawScatter(); });
  $("search").addEventListener("input", e => { S.search = e.target.value; drawTable(slice()); });

  // One delegated handler covers every mark in every view.
  document.addEventListener("mouseover", ev => {
    const m = ev.target.closest(".mark, tbody tr[data-o]");
    if (!m) return;
    const o = +m.dataset.o, r = m.dataset.r === undefined ? findRow(o) : +m.dataset.r;
    highlight(o);
    showTip(officeTip(o, r), ev);
  });
  document.addEventListener("mousemove", ev => {
    if (tip.style.opacity == 1 && ev.target.closest(".mark, tbody tr[data-o]")) showTip(tip.innerHTML, ev);
  });
  document.addEventListener("mouseout", ev => {
    if (ev.target.closest(".mark, tbody tr[data-o]")) { highlight(null); hideTip(); }
  });
  document.addEventListener("click", ev => {
    const m = ev.target.closest(".mark, tbody tr[data-o]");
    if (m) { S.pin = S.pin === +m.dataset.o ? null : +m.dataset.o; render(); return; }
    const th = ev.target.closest("thead th");
    if (th) {
      const col = th.dataset.col;
      if (S.sortCol === col) S.sortDir = -S.sortDir; else { S.sortCol = col; S.sortDir = -1; }
      drawTable(slice());
    }
  });

  setTab(S.tab);
}

const findRow = o => rowsByOffice[o].find(r => D.panel.y[r] === S.yi);

let timer = null;
function togglePlay() {
  S.playing = !S.playing;
  each("play", el => {
    el.classList.toggle("on", S.playing);
    el.innerHTML = S.playing ? "&#10073;&#10073; Pause" : "&#9654; Play";
  });
  clearInterval(timer);
  if (S.playing) timer = setInterval(() => setYear((S.yi + 1) % NY), 900);
}

init();
})();
