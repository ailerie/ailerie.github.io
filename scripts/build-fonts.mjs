#!/usr/bin/env node
// Regenerate the self-hosted web fonts in public/fonts/.
//
//   node scripts/build-fonts.mjs            # only what is missing/stale
//   node scripts/build-fonts.mjs --cjk      # just the CJK subset (fast)
//   node scripts/build-fonts.mjs --force    # rebuild everything
//
// Lyon Text is subsetted to every glyph it ships (the file is small). JetBrains
// Mono is a static latin slice. Noto Serif SC is the one that matters: the full
// face is over 11 MB, so it is subsetted to the characters this site can
// actually emit — every non-ASCII character in src/ and links.json, plus the
// punctuation a post may plausibly introduce. Anything outside that set falls
// back to the reader's system font.
//
// Needs python3 with fontTools and brotli (pip install fonttools brotli).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public/fonts');
const cache = path.join(root, '.cache/fonts');
const args = new Set(process.argv.slice(2));
const onlyCjk = args.has('--cjk');
const force = args.has('--force');

const LYON = process.env.LYON_SRC || '/usr/local/share/fonts/l/LyonText_Regular.ttf';
const CJK_URL =
  process.env.CJK_URL ||
  'https://raw.githubusercontent.com/notofonts/noto-cjk/main/Serif/SubsetOTF/SC/NotoSerifSC-Regular.otf';
const JBM_URL =
  'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxTOlOV.woff2';

fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(cache, { recursive: true });

/* --- characters the site can emit -------------------------------------- */

// Punctuation and symbols a post may use even though none appear today. Kept
// deliberately tight: each extra glyph costs bytes in every visitor's download.
const PUNCT = '，。、；：？！“”‘’（）《》〈〉【】—…·「」『』～％＃＠＆＊＋－＝／＼｜　';

// Zero-width and other format controls have no outline; subsetting them out
// would be reported as a missing glyph.
const DEFAULT_IGNORABLE = (cp) =>
  cp === 0x200b ||
  cp === 0x200c ||
  cp === 0x200d ||
  (cp >= 0x200e && cp <= 0x200f) ||
  (cp >= 0x202a && cp <= 0x202e) ||
  (cp >= 0x2060 && cp <= 0x206f) ||
  cp === 0xfeff;

function walk(dir, exts) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p, exts);
    return exts.some((x) => e.name.endsWith(x)) ? [p] : [];
  });
}

function collectChars() {
  const chars = new Set(PUNCT);
  const files = [
    ...walk(path.join(root, 'src'), ['.astro', '.ts', '.tsx', '.mdoc', '.md', '.css', '.json']),
    path.join(root, 'links.json'),
  ].filter((p) => fs.existsSync(p));
  for (const p of files) {
    for (const ch of fs.readFileSync(p, 'utf8')) {
      const cp = ch.codePointAt(0);
      // Skip the invisible format characters: ZWJ/ZWNJ and friends are shaping
      // controls, not glyphs, so asking the subsetter to keep them fails.
      if (cp > 0x7f && !DEFAULT_IGNORABLE(cp)) chars.add(ch);
    }
  }
  return { chars: [...chars].sort().join(''), files: files.length };
}

/* --- helpers ------------------------------------------------------------ */

function run(cmd, argv) {
  return execFileSync(cmd, argv, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
}

function sizeOf(p) {
  return fs.existsSync(p) ? fs.statSync(p).size : 0;
}

function download(url, dest, label) {
  if (fs.existsSync(dest) && sizeOf(dest) > 1000) return true;
  process.stdout.write(`downloading ${label}... `);
  try {
    run('curl', ['-sfL', '--max-time', '300', '-o', dest, url]);
    console.log(`${(sizeOf(dest) / 1e6).toFixed(1)} MB`);
    return true;
  } catch {
    console.log('failed');
    return false;
  }
}

// pyftsubset's parser takes `--flag=value` pairs; a separate `--output-file
// path` argument is read as a glyph name and the call dies with
// MissingGlyphsSubsettingError.
function subset(src, dest, { textFile = null, unicodes = null, chars = '', features = '' } = {}) {
  const argv = [
    src,
    '--flavor=woff2',
    `--output-file=${dest}`,
    `--layout-features=${features}`,
    '--no-hinting',
    '--desubroutinize',
    '--drop-tables+=DSIG',
  ];
  if (textFile) argv.push(`--text-file=${textFile}`);
  else if (unicodes) argv.push(`--unicodes=${unicodes}`);
  else argv.push(`--text=${chars}`);
  run('pyftsubset', argv);
}

/* --- CJK ---------------------------------------------------------------- */

function buildCjk() {
  const src = path.join(cache, 'NotoSerifSC-Regular.otf');
  if (!download(CJK_URL, src, 'Noto Serif SC (static, 11 MB)')) {
    console.warn('! keeping the existing CJK font; run npm run fonts where the source is reachable');
    return;
  }
  const { chars, files } = collectChars();
  const charFile = path.join(cache, 'chars.txt');
  fs.writeFileSync(charFile, chars);

  const dest = path.join(out, 'NotoSerifSC-Regular.woff2');
  const tmp = path.join(cache, 'cjk.woff2');
  subset(src, tmp, { textFile: charFile });
  fs.copyFileSync(tmp, dest);

  // Every collected character must survive subsetting, or a post renders with a
  // silent fallback glyph.
  const missing = coverCheck(dest, chars);
  const hanzi = [...chars].filter((c) => c.codePointAt(0) >= 0x3400).length;
  console.log(
    `CJK  ${(sizeOf(dest) / 1024).toFixed(0)} KB  ${hanzi} hanzi / ${chars.length} chars from ${files} files`,
  );
  if (missing.length) {
    // Warn instead of failing the build: the character still renders, it just
    // falls back to the reader's system font.
    console.warn(
      `! ${missing.length} character(s) are not in Noto Serif SC and will use the fallback: ${missing.join('')}`,
    );
  }
  fs.writeFileSync(path.join(cache, 'chars.sha1'), createHash('sha1').update(chars).digest('hex'));
}

// pyftsubset may live in an isolated pipx venv, so its interpreter - not the
// system python3 - is the one that can import fontTools.
function pyftsubsetPath() {
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    return run(cmd, ['pyftsubset']).trim().split(String.fromCharCode(10))[0];
  } catch {
    return 'pyftsubset';
  }
}

function fontPython() {
  if (process.env.FONT_PYTHON) return process.env.FONT_PYTHON;
  let shebang = '';
  try {
    shebang = fs.readFileSync(pyftsubsetPath(), 'utf8').split(String.fromCharCode(10), 1)[0];
  } catch {}
  const first = shebang.startsWith('#!') ? shebang.slice(2).trim().split(/\s+/)[0] : '';
  const candidates = [first, 'python3', 'python'].filter(Boolean);
  for (const py of candidates) {
    try {
      run(py, ['-c', 'import fontTools']);
      return py;
    } catch {}
  }
  return null;
}

function coverCheck(fontPath, chars) {
  const script = path.join(cache, 'cover.py');
  fs.writeFileSync(
    script,
    [
      'import sys',
      'from fontTools.ttLib import TTFont',
      'font, chars = sys.argv[1], sys.argv[2]',
      'cmap = TTFont(font).getBestCmap()',
      'print("".join(c for c in chars if ord(c) not in cmap), end="")',
    ].join('\n'),
  );
  const py = fontPython();
  if (!py) {
    console.warn('! no python with fontTools; skipping the subset coverage check');
    return [];
  }
  try {
    return [...run(py, [script, fontPath, chars]).trim()];
  } catch (err) {
    console.warn('! subset coverage check failed: ' + String(err.message).split(String.fromCharCode(10))[0]);
    return [];
  }
}

function cjkStale() {
  if (force || !fs.existsSync(path.join(out, 'NotoSerifSC-Regular.woff2'))) return true;
  const { chars } = collectChars();
  const sha = path.join(cache, 'chars.sha1');
  if (!fs.existsSync(sha)) return true;
  return fs.readFileSync(sha, 'utf8').trim() !== createHash('sha1').update(chars).digest('hex');
}

/* --- main --------------------------------------------------------------- */

if (!onlyCjk) {
  if (!fs.existsSync(LYON)) {
    console.warn(`! Lyon Text not found at ${LYON}; keeping the existing file (set LYON_SRC)`);
  } else {
    subset(LYON, path.join(out, 'LyonText-Regular.woff2'), { unicodes: '*', features: '*' });
    console.log(`lyon ${(sizeOf(path.join(out, 'LyonText-Regular.woff2')) / 1024).toFixed(0)} KB`);
  }

  const jbm = path.join(out, 'JetBrainsMono-Regular.woff2');
  if (force || !fs.existsSync(jbm)) {
    if (!download(JBM_URL, path.join(cache, 'jbm.woff2'), 'JetBrains Mono')) {
      console.warn('! keeping the existing mono font');
    } else {
      fs.copyFileSync(path.join(cache, 'jbm.woff2'), jbm);
      console.log(`mono ${(sizeOf(jbm) / 1024).toFixed(0)} KB`);
    }
  }
}

if (cjkStale()) {
  try {
    execFileSync('pyftsubset', ['--help'], { stdio: 'ignore' });
  } catch {
    console.warn('! pyftsubset not found (pip install fonttools brotli); keeping the existing fonts');
    process.exit(0);
  }
  buildCjk();
} else console.log('CJK  up to date');
