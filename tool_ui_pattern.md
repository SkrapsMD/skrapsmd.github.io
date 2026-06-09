# Interactive Tool UI Pattern

A reusable template for in-browser tools on this site (geocoder-style). One file in `0_code/a_partials/`, one stylesheet in `1_assets/styles/a_partials/`, no backend, no build step. Reference implementation: `0_code/a_partials/07_geocoder.html` + `1_assets/styles/a_partials/07_geocoder.css`.

## The Pattern in One Sentence

A **single-section, multi-step wizard** where exactly one card-panel is visible at a time, driven by a `data-active-step` attribute on the root, with the site's existing `.card` / `.table` / `.input` / `.btn` components doing the heavy lifting.

## Core Principles

1. **One panel visible at a time.** Each step is a separate `<div class="card" data-step="...">`. A wrapper attribute (`data-active-step`) selects which one shows; the rest get a `--hidden` modifier. No tab strip, no accordion — linear progression.
2. **Confirm before you commit.** The middle step always shows the user what the tool inferred from their input plus an editable override, so nothing destructive runs before they say go. For the geocoder this is the column-mapping panel + 5-row preview.
3. **Preview the output before download/commit.** A second confirmation panel after processing — same look as the input preview but with the new derived columns/values visible. Download/save sits behind this panel.
4. **No inline styles or one-off components.** Everything reuses tokens and classes from `1_assets/styles/`. New rules in the tool's own CSS file are layout-only (grid, hide/show, overflow), never visual.
5. **State machine in plain JS, scoped in an IIFE.** No build step. No frameworks. All logic lives in a single `<script>` block inside the partial. Module-level `let` for state, `showStep(name)` as the only mutator of which panel is visible.
6. **Restart returns to the initial state cleanly.** Every "Start over" wipes loaded data, dropdowns, preview tables, progress bars, file input value. Nothing leaks between runs.
7. **Network calls degrade silently.** Try/catch around each fetch (or JSONP); failures return `null`, never throw. Per-row failure becomes a blank output cell, never a stack trace.

## HTML Skeleton

```html
<section class="tool-app" data-active-step="upload">
  <header class="tool-header">
    <h2 class="tool-title">Tool Name</h2>
    <p class="tool-intro">
      One paragraph: what it does, what data goes in, what comes out, where the
      data is sent (or "runs entirely in your browser").
    </p>
    <p class="tool-back">
      <a href="#code" class="btn btn--ghost">&larr; Back to Code &amp; Data</a>
    </p>
  </header>

  <!-- Step 1: Input -->
  <div class="tool-card card" data-step="upload">
    <section class="tool-step">
      <label class="tool-label" for="file-input">1. Choose a file</label>
      <input type="file" id="file-input" accept="...">
      <p class="tool-status mono" id="upload-status">No file loaded.</p>
    </section>
  </div>

  <!-- Step 2: Confirm / configure -->
  <div class="tool-card card tool-step--hidden" data-step="confirm">
    <section class="tool-step">
      <span class="tool-label">2. Confirm what we inferred</span>
      <p class="tool-status mono" id="detect-status"></p>
      <div class="tool-table-wrap">
        <table class="table table--compact" id="preview-input">
          <thead></thead><tbody></tbody>
        </table>
      </div>
    </section>

    <section class="tool-step">
      <span class="tool-label">Configure</span>
      <div class="tool-config-grid">
        <!-- .field / .input pairs go here -->
      </div>
      <p class="tool-helper-text">Helper text about defaults / what's optional.</p>
    </section>

    <section class="tool-step tool-step--actions">
      <button class="btn btn--ghost" id="back-btn">&larr; Choose a different file</button>
      <button class="btn btn--primary" id="run-btn" disabled>Run</button>
    </section>

    <section class="tool-step" id="progress-section" hidden>
      <span class="tool-label">Progress</span>
      <p class="tool-status mono" id="run-status"></p>
      <progress id="progress-bar" value="0" max="1"></progress>
    </section>
  </div>

  <!-- Step 3: Review & download -->
  <div class="tool-card card tool-step--hidden" data-step="review">
    <section class="tool-step">
      <span class="tool-label">3. Review &amp; download</span>
      <p class="tool-status mono" id="review-status"></p>
      <div class="tool-table-wrap">
        <table class="table table--compact" id="preview-output">
          <thead></thead><tbody></tbody>
        </table>
      </div>
    </section>

    <section class="tool-step tool-step--actions">
      <button class="btn btn--ghost" id="restart-btn">Start over</button>
      <button class="btn btn--primary" id="download-btn">Download</button>
    </section>
  </div>
</section>
```

Replace the `tool-` prefix with the tool's own name (`geocoder-`, `cleaner-`, etc.) so each tool's selectors don't collide.

## CSS Hooks (the only new rules each tool needs)

```css
.tool-app {
  max-width: 960px;       /* widen if previews need it */
  margin: 0 auto;
  padding: var(--pad);
}

.tool-card {              /* tool-specific card spacing */
  display: flex;
  flex-direction: column;
  gap: var(--pad-lg);
  padding: var(--pad-lg);
}

.tool-step {              /* one row inside a card */
  display: flex;
  flex-direction: column;
  gap: var(--pad-sm);
}

.tool-step--hidden { display: none; }

.tool-step--actions {     /* right-aligned button footer */
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--pad-sm);
}

.tool-label {             /* small mono uppercase label */
  font-family: var(--font-mono);
  font-size: var(--font-xs);
  color: var(--ink-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.tool-status {            /* mono line for progress / state messages */
  font-size: var(--font-sm);
  color: var(--ink-muted);
  margin: 0;
}

.tool-helper-text {
  font-size: var(--font-xs);
  color: var(--ink-muted);
  margin: 0;
}

.tool-config-grid {       /* mapping/config rows */
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--pad-sm);
}

@media (max-width: 720px) {
  .tool-config-grid { grid-template-columns: 1fr; }
}

.tool-table-wrap {        /* horizontal scroll for wide preview tables */
  overflow-x: auto;
  max-width: 100%;
}

.tool-table-wrap .table { min-width: max-content; }
```

These are layout-only. **Don't redefine colors, type, borders, or spacing tokens** — they live in `00_tokens.css` and the components in `03_components.css`.

## JS State Machine

```js
(function () {
  // ---- Element refs (single resolution at boot) ----
  const root        = document.querySelector('.tool-app');
  const fileInput   = document.getElementById('file-input');
  const runBtn      = document.getElementById('run-btn');
  // ... etc

  if (!root || !fileInput || !runBtn) return;  // partial not mounted

  // ---- State (module-scoped, never global) ----
  let loadedData = null;
  let loadedName = null;
  // ... etc

  // ---- The only function that changes which step is visible ----
  function showStep(name) {
    root.setAttribute('data-active-step', name);
    root.querySelectorAll('[data-step]').forEach(panel => {
      panel.classList.toggle('tool-step--hidden', panel.dataset.step !== name);
    });
  }

  // ---- Event wiring ----
  fileInput.addEventListener('change', async (e) => {
    try {
      // parse, infer, populate preview + config dropdowns
      showStep('confirm');
    } catch (err) {
      // surface error in upload-status; stay on step 1
    }
  });

  runBtn.addEventListener('click', async () => {
    // disable controls, show progress, run row by row, populate preview-output
    showStep('review');
  });

  document.getElementById('restart-btn').addEventListener('click', () => {
    // wipe state, clear DOM, fileInput.value = '', showStep('upload')
  });
})();
```

**Conventions worth keeping:**

- IIFE wrapper so re-entry (the router re-runs inline scripts on every navigation) doesn't pollute globals.
- One `showStep()` function. Don't toggle `.tool-step--hidden` from anywhere else.
- Render previews via a single helper that takes `(tableEl, headers, rows, extraHeaders)`. Reuse it for both the input preview and the output preview.
- Lazy-load any heavy library (XLSX, PDF parsers, etc.) from CDN with a memoized `ensureLib()` promise. Don't ship anything bundled.
- For per-row network work, hold a `progressBar.max = N; progressBar.value = i+1;` inside the loop and update a mono status line `"Processing i of N..."`.

## Router Integration

Add a single line to the `routes` map in `0_code/b_scripts/0_app.js`:

```js
mytool: { file: '0_code/a_partials/NN_mytool.html', css: '1_assets/styles/a_partials/NN_mytool.css' },
```

Then a card on `0_code/a_partials/03_code.html` under the **Tools** caption, with `<a class="btn btn--ghost" href="#mytool">Use Tool &rarr;</a>`. The router handles CSS injection, partial fetch, and inline-script execution.

## Network / Browser Hygiene

- **CORS:** if the API you're calling doesn't send `Access-Control-Allow-Origin`, plain `fetch()` will be blocked by the browser. Check the API for JSONP support (`callback=` or `json_callback=`) and use a `<script>`-tag injection helper instead. Reference: `jsonpRequest()` in the geocoder.
- **Polite throttling:** if you're calling a service with a usage policy (Nominatim's 1 req/sec is the canonical example), gate calls behind a module-level `nextAllowedAt` timestamp. Don't try to throttle from inside a Promise.all.
- **Multi-tier fallback:** for any external lookup, plan the cascade up front. The geocoder uses three tiers; pattern matches well anywhere a "best available" answer is acceptable. Each tier returns `null` on miss; the caller tries the next.

## What Belongs in a Tool Card on `#code`

Each tool gets one card under the **Tools** caption on `03_code.html`:

```html
<div class="card">
  <div class="card-title-row">
    <div class="card-title">Tool Name &mdash; what it does</div>
    <span class="mono card-date">YYYY-MM-DD</span>
  </div>
  <div class="card-body">
    One short paragraph. What goes in, what comes out, where it runs
    (in browser / what external service if any).
  </div>
  <div class="card-badges">
    <span class="badge badge--info">Tools</span>
    <span class="badge badge--info">Domain Tag</span>
  </div>
  <div class="card-action">
    <a class="btn btn--ghost" href="#mytool">Use Tool &rarr;</a>
  </div>
</div>
```

Keep the description grounded — what *flexibility* the tool offers (e.g., "column names don't have to match exactly"), what *fallbacks* it has, and what's *preserved* from the input. That's what users actually want to know before they invest in trying it.

## Checklist for New Tools

- [ ] Partial in `0_code/a_partials/` with the three-step skeleton.
- [ ] Tool-prefixed CSS file in `1_assets/styles/a_partials/`. Layout-only rules.
- [ ] Route added to `0_app.js`.
- [ ] Card added to `03_code.html` under **Tools**.
- [ ] Header has a "Back to Code & Data" link.
- [ ] Step 1 → Step 2 only after successful parse/validation; failures stay on Step 1 with an error in `upload-status`.
- [ ] Step 2 always shows a preview of the input and lets the user override at least one piece of what was auto-detected.
- [ ] Run button stays disabled until required configuration is satisfied.
- [ ] Step 3 always shows a preview of the *output* before the download/commit action is available.
- [ ] "Start over" resets every piece of state (data, dropdowns, file input value, progress bar, status text).
- [ ] All network calls catch errors; per-row failures become blank cells, not exceptions.
- [ ] No inline styles. No new colors. No new spacing values outside `00_tokens.css`.
