# aileri

Astro blog, server-rendered, paper-toned serif theme.

## Layout

```text
src/
├── components/EntryList.astro  list item layout (title, date, author, quotes)
├── content/posts/              posts, Markdoc (.mdoc)
├── layouts/Base.astro          shell + navigation
├── lib/render.ts               Markdoc + Shiki -> html, quote/source extraction
├── live.config.ts              live collection definition
├── pages/                      index (redirect), articles, notes, sites, [slug]
└── styles/global.css           theme
keystatic.config.ts             writing UI schema
public/fonts/                   Lyon Text, Noto Serif SC, JetBrains Mono
public/favicon.svg              tab icon
```

## Two kinds of post

There is no `type` field. A post with an `author` is a **note** (an excerpt
from someone else's piece, signed with their name); a post without one is an
**article**.

- `/` redirects to `/articles`.
- `/articles` lists only posts without `author`.
- `/notes` lists only posts with `author`.

On every list, a post shows its first three blockquotes. Articles have no quotes
by convention, so they fall back to the `description` field instead; if that is
empty too, nothing is shown. Each entry ends with a `[...] More` link to the full
post.

## Reading index

`/sites` is the reading entry: a plain list of sites, each showing a name and a
one-line description, both from `links.json` in this directory. Only the name is
a link, and it opens in a new tab; the description is inert text.

The navigation calls it `index`, but that is not the path: `/` redirects to
`/articles`, and a bare `/index` resolves to that front page on GitHub Pages
rather than to this list. The list itself lives at `/sites`.

Edit `links.json` by hand to add or remove entries — no rebuild, no restart, it is
read on every request:

```json
{
  "sites": [
    { "name": "CFR", "url": "https://cfr.org", "description": "美国对外关系委员会官网。" }
  ]
}
```

`name` and `url` are required; `description` is optional. A bare array of the
same objects also works. Entries appear in file order.

## Writing

Run the site, open `/keystatic`, and write in the browser. Keystatic uses
`storage: { kind: 'local' }`, so it writes `src/content/posts/*.mdoc` directly on
this machine with no auth, no proxy and no external service.

Posts are read through an Astro live collection (`src/live.config.ts`), which
reads the files per request. New and edited posts appear on reload, without a
rebuild.

Each post's `slug` is both its filename and its URL path. Keystatic derives it
from the title; because its built-in slugifier keeps ASCII only, a Chinese title
would yield an empty slug, so `keystatic.config.ts` supplies its own generator:
Latin titles become `my-title`, titles containing CJK become `post-<hash>` or
`<latin-part>-<hash>`. Edit the Slug field to set a nicer path.

## Themes

Two themes share one layout; only type and colour change.

- **paper** (default) — Lyon Text serif, warm paper ground `#f6f1e7`, deep green headings.
- **terminal** — the previous monospace dark theme, `#0b0d0e` ground, `#7fb069` accent.

The `>` button fixed at the top-left corner of the page switches between them.
The choice is stored in `localStorage` and applied before first paint, so it
survives navigation and reloads. `?theme=paper` or `?theme=terminal` in a URL
forces a theme once and records it.

Code blocks are highlighted twice, with Shiki's `--shiki-light` and
`--shiki-dark` variables on every token; the theme switch just picks a variable,
so no re-highlighting happens.

## Fonts

All three typefaces are self-hosted from `public/fonts/` so the site looks the
same on machines that do not have them installed. Each `@font-face` lists
`local()` first, so readers who already own a font download nothing.

| Family | File | Size | Used by |
| --- | --- | --- | --- |
| Lyon Text | `LyonText-Regular.woff2` | 40 KB | paper theme body, headings, quotes |
| Noto Serif SC | `NotoSerifSC-Regular.woff2` | 208 KB | paper theme, Chinese fallback |
| JetBrains Mono | `JetBrainsMono-Regular.woff2` | 21 KB | terminal theme, all text |

The Chinese face is subsetted to the characters the site can actually emit:
every non-ASCII character in `src/` and `links.json`, plus the punctuation a
post may plausibly introduce. That is 1161 glyphs, so the file is 208 KB instead
of 1.2 MB. **A character outside that set renders through the system fallback
rather than this file** — the generator rescans on every build, so writing a new
hanzi and rebuilding pulls it in:

```sh
npm run fonts         # regenerate; needs pyftsubset (pip install fonttools brotli)
npm run fonts:force   # rebuild all three faces
```

`scripts/build-fonts.mjs` regenerates the faces and is part of `npm run build`,
so a deploy never ships a stale subset. It downloads the source faces into
`.cache/fonts/` on first use; override with `LYON_SRC` / `CJK_URL` / `FONT_PYTHON`.
Where `pyftsubset` is missing the script keeps the committed files and the build
continues.

Lyon Text is a commercial typeface (© Commercial Type). Serving it via
`@font-face` requires a licence upgrade from the foundry; the file is hosted
here on the site owner's own responsibility.

## Commands

```sh
npm run dev      # dev server on 127.0.0.1:4321
npm run build    # build to dist/
npm run preview  # preview the build
npm run fonts    # regenerate public/fonts/ subsets
```

## Deployment

The same repository is served in two places, and they are not alternatives — both
exist at once, with different jobs:

| | Local | Published |
| --- | --- | --- |
| URL | <http://127.0.0.1:4321> | <https://ailerie.github.io/> |
| Serves | a Node process, rendering on demand | static files only |
| Build | `npm run build` → `dist/` | `npm run build:publish` → `dist-publish/` |
| Writing | `/keystatic` works | absent — no write route, no write link |
| Contents | every non-draft post | every non-draft post, as of the last push |

Writing happens locally only. The published copy is a read-only snapshot of what
has been committed and pushed.

### Local: systemd user service

The site runs as a systemd user service on `127.0.0.1:4321`.

```sh
systemctl --user status blog.service
systemctl --user restart blog.service
journalctl --user -u blog.service -f
```

The unit is `~/.config/systemd/user/blog.service`; it runs
`node dist/server/entry.mjs` from this directory. Linger is enabled for the user,
so it keeps running after logout and starts on boot. After changing source:

```sh
npm run build && systemctl --user restart blog.service
```

Posts are read through a live collection, so writing or editing a post needs no
rebuild — only a reload. Rebuild and restart when anything outside
`src/content/posts/` changes: components, the config, the stylesheet.

### Published: GitHub Pages

`ailerie/ailerie.github.io` publishes to <https://ailerie.github.io/> on every
push to `main`. Pages can only serve files, so the published build differs from
the local one in three ways, all driven by the `PUBLISH` environment variable:

- `astro.config.publish.mjs` replaces `astro.config.mjs`. It drops the Keystatic
  integration, so `/keystatic` and `/api/keystatic` do not exist in the output at
  all — they are absent, not hidden. React and Markdoc stay.
- The navigation omits the `write` link, and `src/pages/[slug].astro` exports a
  `getStaticPaths()` so every post is pre-rendered. Without `PUBLISH` that export
  is `undefined` and the local server keeps rendering on demand.
- The front page changes too: locally `/` answers with a 302 to `/articles`, but a
  static host cannot redirect, so the published `index.html` is a zero-delay meta
  refresh to `/articles/`.

```sh
npm run build            # local: server output in dist/, Keystatic included
npm run build:publish    # publishing: static output in dist-publish/, no Keystatic
```

`.github/workflows/deploy.yml` runs `npm run build:publish` on every push to
`main` and deploys `dist-publish` through GitHub Pages.

#### One-time repository setup

1. Create the repository `ailerie.github.io` (the name must match the username for
   the site to live at the bare domain).
2. Push this project to its `main` branch.
3. In the repository, open **Settings → Pages** and set **Source** to
   **GitHub Actions**.

#### Publishing a post

```sh
git add -A && git commit -m "New post" && git push
```

The push triggers the workflow; the post is live about a minute later.

## Theme archive

`.archive/2026-11-12-terminal-theme/` holds the previous dark terminal theme
(`src/`, `keystatic.config.ts`, `astro.config.mjs`). `.archive/README.txt` has the
restore steps. Use it when you want that look back, or as a reference for how the
theme variables were arranged before the paper redesign.
