# Website Performance Optimization Documentation

## Overview
This document outlines the performance optimizations made to improve load times and navigation speed for the static website.

## Optimizations Implemented

### 1. Brand Icon Flash Prevention
**Problem**: Large brand icon images (1.2-2.4MB PNG files) were causing a noticeable flash of unsized content during page navigation, especially on mobile devices.

**Solution**: 
- Added explicit CSS sizing rules for `#brand-icon` to prevent layout shift
- Moved inline styles from HTML to CSS classes for better caching
- Browser now knows image dimensions before download completes

**Impact**:
- Eliminates visual flash during navigation
- Improves Cumulative Layout Shift (CLS) score
- Better user experience on slower connections

**Files Changed**:
- `index.html` - Removed inline styles
- `1_assets/styles/02_shell.css` - Added `.brand` and `#brand-icon` rules

**Future Optimization**: Compress brand icon PNGs to < 50KB using image optimization tools.

---

### 2. Research Card System Refactor
**Problem**: Inefficient research card rendering system:
- Large JavaScript data object (3KB+) containing all publication metadata
- Template HTML file fetched on every page load
- JavaScript DOM manipulation to inject data into template
- Single point of failure - all cards fail if template fails

**Solution**: Individual HTML files per research paper
- Created `0_code/research_cards/` directory
- Each paper is now a complete, self-contained HTML file:
  - `meyer2025tariffs.html`
  - `baslandze2025tariffs.html`
  - `fang2024labor.html`
- New `loadResearchCards()` function fetches cards in parallel using `Promise.all()`
- No DOM manipulation needed - just concatenate and inject HTML

**Impact**:
- **Reduced JavaScript size**: Eliminated 3KB+ publications data object
- **Parallel loading**: All cards fetch simultaneously instead of sequentially
- **Easier maintenance**: Content editors can update HTML directly without touching JavaScript
- **Better separation of concerns**: Content (HTML) separate from behavior (JS)
- **Faster rendering**: No template parsing or field injection
- **Improved resilience**: One card failing doesn't break others

**Files Changed**:
- `0_code/b_scripts/0_app.js` - Simplified card loading logic
- `0_code/a_partials/02_research.html` - Updated to use new function
- Created 3 new research card HTML files

**Performance Metrics**:
- Before: 1 template fetch + DOM manipulation for each card
- After: Parallel fetch of pre-built HTML cards
- JavaScript file size reduced by ~3KB (uncompressed)

---

### 3. CSS Loading Strategy
**Current State**: Already optimized
- Global CSS loads once in `index.html`
- Page-specific CSS dynamically loaded/removed via `ensurePageCSS()`
- Old page CSS removed before new page CSS added
- Prevents CSS bloat from accumulating during navigation

**No changes needed** - this is already efficient.

---

## Performance Best Practices Followed

1. **Minimize HTML parsing**: Pre-built cards reduce DOM manipulation
2. **Parallel asset loading**: `Promise.all()` for concurrent card fetches
3. **CSS specificity**: Explicit sizing prevents layout shift
4. **Separation of concerns**: Content in HTML, behavior in JS, presentation in CSS
5. **Progressive enhancement**: Cards load independently, failures are isolated

---

## Future Optimization Opportunities

### High Priority
1. **Image Optimization**
   - Compress brand icon PNGs (currently 1.2-2.4MB → target < 50KB)
   - Use WebP format with PNG fallback
   - Add `<picture>` element with responsive images
   - Tools: ImageMagick, pngquant, or online services

2. **Lazy Loading**
   - Add `loading="lazy"` to off-screen images
   - Defer non-critical card loading until scroll

### Medium Priority
3. **HTTP/2 Server Push**
   - Pre-push critical CSS and fonts
   - Requires server configuration

4. **Service Worker**
   - Cache static assets
   - Offline support for previously visited pages

5. **Resource Hints**
   - Add `<link rel="preconnect">` for external domains
   - Add `<link rel="dns-prefetch">` for CDN resources

### Low Priority
6. **Code Splitting**
   - Split JavaScript by page/feature if site grows
   - Currently single JS file is small enough

7. **CSS Minification**
   - Minify CSS files for production
   - Can reduce file size by 20-30%

---

## Measurement & Testing

### Tools for Performance Testing
- Chrome DevTools Lighthouse
- WebPageTest.org
- Chrome DevTools Performance tab
- Network tab (throttle to simulate slow connections)

### Key Metrics to Monitor
- **First Contentful Paint (FCP)**: Time to first text/image
- **Largest Contentful Paint (LCP)**: Time to main content
- **Cumulative Layout Shift (CLS)**: Visual stability
- **Time to Interactive (TTI)**: Time until page is interactive
- **Total Blocking Time (TBT)**: Main thread blocking time

### Current Performance Expectations
- **FCP**: < 1.5s on 3G
- **LCP**: < 2.5s on 3G
- **CLS**: < 0.1 (minimal layout shift)
- **JavaScript execution**: < 100ms for card loading

---

## Maintenance Notes

### Adding New Research Papers
1. Create new HTML file in `0_code/research_cards/[paperid].html`
2. Copy structure from existing card
3. Update content (title, authors, abstract, etc.)
4. Add `[paperid]` to appropriate page arrays:
   - Research page: `0_code/a_partials/02_research.html`
   - People pages: `0_code/people_index/[person].html`

No JavaScript changes required!

### Updating Existing Cards
1. Edit the HTML file directly in `0_code/research_cards/`
2. No need to touch JavaScript or templates
3. Changes appear immediately

---

## Technical Decisions

### Why Individual HTML Files Instead of JSON?
1. **Simpler**: No parsing, no template engine, no data binding
2. **Faster**: Browser-native HTML parsing is optimized
3. **More maintainable**: Non-developers can edit HTML
4. **Better caching**: Each card can be cached independently
5. **SEO-friendly**: Pre-rendered content is immediately indexable

### Why Not a Build Step?
Current site philosophy: "Built static" means no build process
- Keeps development simple
- No Node.js/npm dependencies
- Easy to deploy (just push to GitHub Pages)
- If site grows significantly, consider adding build step for:
  - Image optimization
  - CSS/JS minification
  - HTML preprocessing

---

## Last Updated
January 30, 2026
