# aileri

Astro blog, server-rendered, terminal theme.

## Layout

```text
src/
├── content/posts/     posts, Markdoc (.mdoc)
├── layouts/Base.astro shell
├── lib/render.ts      Markdoc + Shiki -> html
├── live.config.ts     live collection definition
├── pages/             index, [slug], rss.xml
└── styles/global.css  theme
keystatic.config.ts    writing UI schema
```

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

## Commands

```sh
npm run dev      # dev server on 127.0.0.1:4321
npm run build    # build to dist/
npm run preview  # preview the build
```

## Deploy

The site runs as a systemd user service, listening on `127.0.0.1:4321`.

```sh
systemctl --user status blog.service
systemctl --user restart blog.service
journalctl --user -u blog.service -f
```

The unit is `~/.config/systemd/user/blog.service`; it runs
`node dist/server/entry.mjs` from this directory. Linger is enabled for the
user, so it keeps running after logout and starts on boot.

After changing source, rebuild and restart:

```sh
npm run build && systemctl --user restart blog.service
```
