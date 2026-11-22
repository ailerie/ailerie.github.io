import { createElement } from 'react';
import { config, collection, fields } from '@keystatic/core';

// Keystatic 自带的 slug 生成只保留 ASCII，中文标题会得到空串，
// Slug 因此变成必填。这里给中文标题补一个可用的路径。
const slugify = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/[\s-]+/g, '-');

const shortHash = (input: string) => {
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return h.toString(36).slice(0, 4).padStart(4, '0');
};

// 中日韩文字会被 slugify 整个丢掉，需要额外区分
const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/;

const generateSlug = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return '';
  const ascii = slugify(trimmed);
  // 纯拉丁标题直接用作路径
  if (!CJK.test(trimmed)) return ascii;
  // 含中日韩文字时补短哈希，避免 "Astro 博客搭建" 与 "Astro 教程" 撞车
  const suffix = shortHash(trimmed);
  return ascii ? `${ascii}-${suffix}` : `post-${suffix}`;
};

// 侧边栏品牌图标换成一个返回首页的链接（Keystatic 没有自定义导航项的接口，
// ui.brand.mark 是唯一能塞进侧边栏的自定义渲染点）
const BackMark = ({ colorScheme }: { colorScheme: 'light' | 'dark' }) =>
  createElement(
    'a',
    {
      href: '/',
      title: 'back to index',
      'aria-label': 'back to index',
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        color: 'inherit',
        textDecoration: 'none',
      },
    },
    createElement(
      'svg',
      {
        width: 20,
        height: 20,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        'data-color-scheme': colorScheme,
      },
      createElement('path', { d: 'M19 12H5' }),
      createElement('path', { d: 'M11 18l-6-6 6-6' }),
    ),
  );

export default config({
  storage: { kind: 'local' },
  ui: {
    brand: { name: 'aileri', mark: BackMark },
  },
  collections: {
    posts: collection({
      label: 'Posts',
      path: 'src/content/posts/*',
      format: { contentField: 'content' },
      slugField: 'title',
      entryLayout: 'content',
      previewUrl: '/{slug}/',
      columns: ['title', 'date', 'author'],
      schema: {
        title: fields.slug({
          name: { label: 'Title' },
          slug: {
            label: 'Slug',
            generate: generateSlug,
          },
        }),
        date: fields.date({ label: 'Date', validation: { isRequired: true } }),
        author: fields.text({ label: 'Author' }),
        description: fields.text({ label: 'Description', multiline: true }),
        draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
        content: fields.markdoc({ label: 'Content', extension: 'mdoc' }),
      },
    }),
  },
});
