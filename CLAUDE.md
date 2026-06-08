# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Static single-page website for **放課後等デイサービス そら** (Sora After-School Care Service), a Japanese after-school support facility in Tondabayashi, Osaka. No build system — plain HTML/CSS/JS served as static files.

## Development

Open `index.html` directly in a browser, or serve locally:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

There are no tests, linters, or build steps.

## Architecture

### File layout

| File | Purpose |
|------|---------|
| `index.html` | Entire site (single page, all sections) |
| `css/style.css` | All styles — CSS custom properties defined in `:root` |
| `js/main.js` | Scroll spy (IntersectionObserver), sidebar toggle, smooth scroll, contact form stub |
| `js/partials.js` | Injects shared sidebar/overlay HTML for future multi-page expansion; highlights current-page nav link |
| `js/news-date.js` | **Contains the `NEWS_DATA` array** — source of truth for all news/blog posts |
| `js/news.js` | Reads `NEWS_DATA`, renders cards into `#news-list`, handles modal open/close |

### News system

News articles live in `js/news-date.js` as a plain JS array assigned to `const NEWS_DATA`. To add or edit articles, modify that array. Each entry shape:

```js
{
  date: "YYYY-MM-DD",   // used for sort order and NEW badge (≤14 days)
  tag: "news"|"blog"|"event",
  title: "...",
  excerpt: "...",       // shown on card; \n becomes <br>
  url: "https://..."    // optional; if present, card links out instead of opening modal
}
```

Cards are sorted newest-first automatically.

### Responsive layout

Breakpoint is **960 px** (defined in `main.js` media queries and `css/style.css`). Below 960 px the left sidebar becomes a hamburger overlay. The `.side-nav` is pre-populated with hand-written HTML in `index.html`; `partials.js` only injects content when the element is empty (reserved for future sub-pages).

### Contact form

The form POSTs to Google Forms (`https://docs.google.com/forms/d/e/…/formResponse`). Field `name` attributes map to Google Forms entry IDs. The sending/success/error UI is driven by `.form-overlay` states toggled in `main.js`.

### Design tokens

All colors are CSS custom properties on `:root` in `style.css`:
- `--sora-blue` / `--sora-blue-deep` / `--sora-blue-soft` / `--sora-blue-bg` — primary palette
- `--sora-yellow` / `--sora-cream` — accent/background
- `--sidebar-w: 260px` — sidebar width used in layout calculations
