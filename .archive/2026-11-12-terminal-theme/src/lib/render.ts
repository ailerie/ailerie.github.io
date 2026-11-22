import Markdoc from '@markdoc/markdoc';
import { createHighlighterCoreSync } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import ts from 'shiki/langs/typescript.mjs';
import js from 'shiki/langs/javascript.mjs';
import bash from 'shiki/langs/bash.mjs';
import json from 'shiki/langs/json.mjs';
import css from 'shiki/langs/css.mjs';
import html from 'shiki/langs/html.mjs';
import md from 'shiki/langs/markdown.mjs';
import py from 'shiki/langs/python.mjs';
import rs from 'shiki/langs/rust.mjs';
import go from 'shiki/langs/go.mjs';
import yaml from 'shiki/langs/yaml.mjs';
import diff from 'shiki/langs/diff.mjs';
import theme from 'shiki/themes/github-dark-default.mjs';

const highlighter = createHighlighterCoreSync({
  themes: [theme],
  langs: [ts, js, bash, json, css, html, md, py, rs, go, yaml, diff],
  engine: createJavaScriptRegexEngine(),
});

const THEME = 'github-dark-default';

const unescapeHtml = (value: string) =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

const highlight = (code: string, lang: string) => {
  const language = lang && highlighter.getLoadedLanguages().includes(lang) ? lang : 'text';
  return highlighter.codeToHtml(code, { lang: language, theme: THEME });
};

export function renderMarkdoc(source: string): string {
  const ast = Markdoc.parse(source);
  const html = Markdoc.renderers
    .html(Markdoc.transform(ast))
    .replace(/^<article>/, '')
    .replace(/<\/article>$/, '');

  return html.replace(
    /<pre data-language="([^"]*)">([\s\S]*?)<\/pre>/g,
    (match, lang: string, body: string) => highlight(unescapeHtml(body), lang)
  );
}
