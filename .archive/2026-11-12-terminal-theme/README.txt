深色终端主题存档 (2026-11-12 20:3x)

这是改版为「纸感浅色 / Lyon Text 衬线」之前的完整状态：
- src/styles/global.css   深色终端主题 (bg #0b0d0e, accent #7fb069, 全等宽字体)
- src/pages/               index.astro ([slug].astro rss.xml.ts)
- src/layouts/Base.astro   nav: index / write
- keystatic.config.ts      单 collection posts (title/date/description/draft/content)
- live.config.ts           自建 live collection loader
- astro.config.mjs         output:'server' + @astrojs/node standalone

恢复方法: 把上述文件 cp 回 /home/aileri/Blog/ 对应位置，然后 rm -rf .astro dist && npm run build && systemctl --user restart blog.service
