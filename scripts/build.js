// Build: joins src/ into one classic script, dist/snake-game.js (no dependencies, only node:*).
// It follows relative imports from src/snake-game.js and puts files in dependency order.
//
// Rules the sources must follow (the build fails with file:line when one is broken):
//   - imports only as:   import { a, b } from './x.js'
//   - exports only as:   export function|class|const|let ...   or   export { a } from './x.js'
//   - forbidden: export default, import * as, import(), import.meta, circular imports,
//     and the same top-level name declared in two files.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultEntry = resolve(rootDir, 'src/snake-game.js');
const outFile = resolve(rootDir, 'dist/snake-game.js');

const IMPORT_RE = /^import\s*\{([^}]*)\}\s*from\s*'(\.\.?\/[^']+)'\s*;?[ \t]*(?:\r?\n|$)/gm;
const REEXPORT_RE = /^export\s*\{([^}]*)\}\s*from\s*'(\.\.?\/[^']+)'\s*;?[ \t]*(?:\r?\n|$)/gm;
const EXPORT_DECL_RE = /^export\s+(function|class|const|let)\s+([A-Za-z_$][\w$]*)/gm;
const TOP_LEVEL_RE = /^(?:function|class|const|let)\s+([A-Za-z_$][\w$]*)/gm;

class BuildError extends Error {}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

function fail(file, text, index, message) {
  throw new BuildError(`${relative(rootDir, file)}:${lineOf(text, index)}: ${message}`);
}

function checkForbidden(file, text) {
  const forbidden = [
    [/^\s*export\s+default\b/m, 'export default is not supported'],
    [/\bimport\s*\*/, 'import * is not supported'],
    [/\bimport\s*\(/, 'dynamic import() is not supported'],
    [/\bimport\.meta\b/, 'import.meta is not supported'],
    [/^export\s*\*/m, 'export * is not supported'],
  ];
  for (const [re, message] of forbidden) {
    const match = re.exec(text);
    if (match) fail(file, text, match.index, message);
  }
}

function parseModule(file) {
  const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  checkForbidden(file, text);
  const deps = [];
  const reExported = [];
  const resolveDep = (spec) => resolve(dirname(file), spec);
  let code = text.replace(IMPORT_RE, (m, names, spec) => {
    deps.push(resolveDep(spec));
    return '';
  });
  code = code.replace(REEXPORT_RE, (m, names, spec) => {
    deps.push(resolveDep(spec));
    for (const name of names.split(',').map((n) => n.trim()).filter(Boolean)) reExported.push(name);
    return '';
  });
  const exported = [...reExported];
  code = code.replace(EXPORT_DECL_RE, (m, kind, name) => {
    exported.push(name);
    return `${kind} ${name}`;
  });
  // Anything still starting with import/export is a shape the build does not understand.
  const leftover = /^(import|export)\b/m.exec(code);
  if (leftover) {
    const badLine = code.slice(leftover.index).split('\n')[0];
    fail(file, text, Math.max(0, text.indexOf(badLine)), `unsupported ${leftover[1]} syntax`);
  }
  const declared = [];
  let match;
  TOP_LEVEL_RE.lastIndex = 0;
  while ((match = TOP_LEVEL_RE.exec(code)) !== null) declared.push({ name: match[1], index: match.index });
  return { file, text, code: code.trim(), deps, exported, declared };
}

// Removes // and /* */ comments from JavaScript source (the dist is generated, so it does not need them).
// A small scanner instead of a regex: it skips strings, template literals (also nested ones) and regex literals,
// so a "//" inside them stays. A line that only held a comment disappears.
const REGEX_AFTER_WORD = new Set(['return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'throw', 'new', 'else', 'do', 'yield', 'await', 'instanceof']);

export function stripComments(src) {
  let out = '';
  let i = 0;
  let prev = ''; // last significant character ('a' stands for a word, a number or a string)
  let word = ''; // the last word, to tell `return /re/` from `a / b`
  const braces = []; // one counter per open `${` of a template: how many `{` are open inside it
  const isWord = (c) => /[A-Za-z0-9_$]/.test(c);
  const readTemplate = () => { // i is just after a backtick, or just after the `}` that closes a `${`
    while (i < src.length) {
      const c = src[i];
      if (c === '\\') { out += src.slice(i, i + 2); i += 2; continue; }
      out += c;
      i += 1;
      if (c === '`') return;
      if (c === '$' && src[i] === '{') { out += '{'; i += 1; braces.push(0); return; }
    }
  };
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (c === '/' && (next === '/' || next === '*')) {
      const end = next === '/' ? src.indexOf('\n', i) : src.indexOf('*/', i + 2) + 2;
      i = end <= (next === '/' ? -1 : 1) ? src.length : end; // an unclosed comment ends the file
      out = out.replace(/[ \t]+$/, '');
      const alone = out === '' || out.endsWith('\n');
      const rest = /^[ \t]*\n/.exec(src.slice(i));
      if (alone && rest) i += rest[0].length; // the whole line was a comment
      else if (next === '*' && !alone && !/\s/.test(src[i] || '\n')) out += ' ';
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
      out += src.slice(i, j + 1);
      i = j + 1;
      prev = 'a';
      word = '';
      continue;
    }
    if (c === '`') {
      out += c;
      i += 1;
      readTemplate();
      prev = 'a';
      word = '';
      continue;
    }
    if (c === '/' && (prev === '' || (prev === 'a' ? REGEX_AFTER_WORD.has(word) : !')]'.includes(prev)))) {
      let j = i + 1;
      let inClass = false;
      while (j < src.length && src[j] !== '\n' && (src[j] !== '/' || inClass)) {
        if (src[j] === '\\') j += 1;
        else if (src[j] === '[') inClass = true;
        else if (src[j] === ']') inClass = false;
        j += 1;
      }
      j += 1;
      while (j < src.length && isWord(src[j])) j += 1;
      out += src.slice(i, j);
      i = j;
      prev = 'a';
      word = '';
      continue;
    }
    if (isWord(c)) {
      let j = i;
      while (j < src.length && isWord(src[j])) j += 1;
      word = src.slice(i, j);
      out += word;
      i = j;
      prev = 'a';
      continue;
    }
    if (braces.length > 0 && c === '{') braces[braces.length - 1] += 1;
    if (braces.length > 0 && c === '}') {
      if (braces[braces.length - 1] === 0) { // the `${ ... }` ends: back to the template text
        braces.pop();
        out += c;
        i += 1;
        readTemplate();
        prev = 'a';
        word = '';
        continue;
      }
      braces[braces.length - 1] -= 1;
    }
    out += c;
    i += 1;
    if (!/\s/.test(c)) {
      prev = c;
      word = '';
    }
  }
  return out;
}

export function bundle(entry = defaultEntry) {
  const entryPath = resolve(entry);
  const ordered = [];
  const done = new Set();
  const visiting = new Set();
  const owner = new Map();

  function visit(file) {
    if (done.has(file)) return;
    if (visiting.has(file)) throw new BuildError(`${relative(rootDir, file)}: circular import`);
    visiting.add(file);
    const mod = parseModule(file);
    for (const dep of mod.deps) visit(dep);
    visiting.delete(file);
    for (const { name } of mod.declared) {
      if (owner.has(name)) {
        fail(file, mod.text, mod.text.indexOf(name), `"${name}" is already declared in ${relative(rootDir, owner.get(name))}`);
      }
      owner.set(name, file);
    }
    done.add(file);
    ordered.push(mod);
  }
  visit(entryPath);

  const entryMod = ordered[ordered.length - 1];
  const version = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8')).version;
  const exportsList = [...new Set(entryMod.exported)];
  const parts = ordered.map((m) => `// ---- ${relative(rootDir, m.file).split('\\').join('/')} ----\n${stripComments(m.code).trim()}`);

  const globalBlock = [
    '// ---- global ----',
    '{',
    'const root = typeof window !== \'undefined\' ? window : globalThis;',
    'if (root.SnakeGame) {',
    "  console.warn('window.SnakeGame already exists; keeping the existing one.');",
    '} else {',
    `  root.SnakeGame = { version: '${version}', ${exportsList.join(', ')} };`,
    '}',
    '}',
  ].join('\n');

  const header = `/* snake-game v${version} | MIT (c) 2026 Carolina Cajazeira (@akacaja) | Generated by scripts/build.js from src/. Do not edit. */`;
  const body = [...parts, globalBlock].join('\n\n');
  return `${header}\n(function () {\n'use strict';\n\n${body}\n})();\n`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const text = bundle();
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, text);
    console.log(`Wrote ${relative(rootDir, outFile)} (${text.length} bytes)`);
  } catch (error) {
    if (error instanceof BuildError) {
      console.error(`Build failed: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }
}

export { BuildError };
