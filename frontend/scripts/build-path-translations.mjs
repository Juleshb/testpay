#!/usr/bin/env node
/**
 * Builds pages-path-translations.json with FR/SW for every leaf path in en.
 * Run: node scripts/build-path-translations.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const en = JSON.parse(readFileSync(join(__dirname, '.en-pages.json'), 'utf8'));

function walk(obj, fn, path = []) {
  if (typeof obj === 'string') fn(path, obj);
  else if (Array.isArray(obj)) obj.forEach((v, i) => walk(v, fn, [...path, String(i)]));
  else if (obj && typeof obj === 'object') Object.entries(obj).forEach(([k, v]) => walk(v, fn, [...path, k]));
}

function clone(o) { return JSON.parse(JSON.stringify(o)); }

/** Deep-translate a tree using per-path maps */
function translateTree(enTree, pathMap) {
  const out = clone(enTree);
  walk(enTree, (path) => {
    const key = path.join('.');
    if (pathMap[key] != null) {
      let cur = out;
      for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
      cur[path[path.length - 1]] = pathMap[key];
    }
  });
  return out;
}

// Build FR/SW trees by namespace — each nsXxxFr/Sw export is a fully translated subtree
const { trees } = await import('./locale-trees.mjs');

const frMap = {};
const swMap = {};

walk(en, (path) => {
  const key = path.join('.');
  const ns = path[0];
  const frTree = trees.fr[ns];
  const swTree = trees.sw[ns];
  if (!frTree || !swTree) return;
  let frCur = frTree;
  let swCur = swTree;
  let enCur = en[ns];
  for (let i = 1; i < path.length; i++) {
    frCur = frCur?.[path[i]];
    swCur = swCur?.[path[i]];
    enCur = enCur?.[path[i]];
  }
  if (typeof frCur === 'string') frMap[key] = frCur;
  if (typeof swCur === 'string') swMap[key] = swCur;
});

writeFileSync(join(__dirname, 'pages-path-translations.json'), JSON.stringify({ fr: frMap, sw: swMap }, null, 2));
console.log(`Built path translations: ${Object.keys(frMap).length} paths`);
