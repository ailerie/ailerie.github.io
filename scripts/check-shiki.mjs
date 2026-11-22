
import { createHighlighterCoreSync } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import ts from 'shiki/langs/typescript.mjs';
import light from 'shiki/themes/github-light-default.mjs';
import dark from 'shiki/themes/github-dark-default.mjs';
const h = createHighlighterCoreSync({ themes:[light,dark], langs:[ts], engine: createJavaScriptRegexEngine() });
console.log(h.codeToHtml('const a = 1;', { lang:'ts', themes:{light:'github-light-default', dark:'github-dark-default'}, defaultColor:false }).slice(0,600));
