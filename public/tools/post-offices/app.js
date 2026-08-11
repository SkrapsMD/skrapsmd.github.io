/* Post office explorer.
   Vanilla JS + inline SVG: the page is opened straight from disk, so it can load
   no library and cannot fetch() its own data — both bundles arrive as globals. */

(function () {
"use strict";

const D = window.PO_DATA, G = window.PO_GEO;

/* The railroad bundle is optional: without data/rail.js the page drops its second
   tab rather than failing to start. */
const R = window.PO_RAIL || null;

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
    COV_ALL, COV_OFF, COV_NONE, PIN_ROW;

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
function railWindow() {
  const st = S.state && GEO_BY_NAME.get(S.state);
  if (!st) return null;
  const [lon0, lat0, lon1, lat1] = lonlatBounds(st.rings);
  const px = (lon1 - lon0) * 0.05, py = (lat1 - lat0) * 0.05;
  return [lon0 - px, lat0 - py, lon1 + px, lat1 + py];
}

function railPaths(key, V) {
  if (railCache.has(key)) return railCache.get(key);

  const k = 1 / R.scale, win = railWindow();
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
  const P = railPaths(S.state || "", V);
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
  if (pts.length < 2) { $("scatter").innerHTML = emptyNote(W, H); $("scatter-cap").textContent = "Too few offices report both."; return; }

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
  const rows = slice(), sc = scales(rows);

  // Only the visible tab is drawn; the other one is redrawn when it is opened.
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

function setTab(name) {
  S.tab = R && name === "rail" ? "rail" : "explorer";
  $("tab-explorer").hidden = S.tab !== "explorer";
  $("tab-rail").hidden = S.tab !== "rail";
  $("tab-btn-explorer").classList.toggle("on", S.tab === "explorer");
  $("tab-btn-rail").classList.toggle("on", S.tab === "rail");
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

  if (!R) $("tab-btn-rail").hidden = true;
  for (const b of [$("tab-btn-explorer"), $("tab-btn-rail")])
    b.addEventListener("click", () => setTab(b.dataset.tab));

  on("year", "input", e => setYear(+e.target.value));
  on("play", "click", togglePlay);
  document.addEventListener("keydown", ev => {
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
