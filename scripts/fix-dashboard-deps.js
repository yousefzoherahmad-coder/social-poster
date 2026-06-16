#!/usr/bin/env node
/**
 * Fix dashboard build dependencies for Replit environment.
 * 
 * Replit's Linux environment has two known issues with the dashboard build:
 * 1. Rollup's native Linux binary crashes with Bus error — patched to use WASM version
 * 2. react-hot-toast dist is missing its .mjs file — patched to use CJS
 * 3. node-releases is missing release-schedule.json — created from known data
 *
 * Run this after `npm install` in the dashboard directory:
 *   node scripts/fix-dashboard-deps.js
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dashDir = join(root, 'dashboard');
const modules = join(dashDir, 'node_modules');

let fixes = 0;

// ── 1. Patch Rollup to use WASM (fixes Bus error on Replit) ──────────────────
const rollupNative = join(modules, 'rollup/dist/native.js');
const wasmNative   = join(modules, '@rollup/wasm-node/dist/native.js');
const rollupWasmDir = join(modules, 'rollup/dist/wasm-node');
const wasmNodeDir   = join(modules, '@rollup/wasm-node/dist/wasm-node');

if (existsSync(wasmNative) && existsSync(rollupNative)) {
  const current = readFileSync(rollupNative, 'utf8');
  if (!current.includes('wasm-node')) {
    copyFileSync(wasmNative, rollupNative);
    // Copy wasm-node bindings directory
    if (existsSync(wasmNodeDir) && !existsSync(rollupWasmDir)) {
      mkdirSync(rollupWasmDir, { recursive: true });
      for (const f of ['bindings_wasm.js', 'bindings_wasm_bg.wasm']) {
        const src = join(wasmNodeDir, f);
        if (existsSync(src)) copyFileSync(src, join(rollupWasmDir, f));
      }
    }
    console.log('✅ Patched Rollup: native binary → WASM (fixes Bus error)');
    fixes++;
  }
}

// ── 2. Fix react-hot-toast missing .mjs file ─────────────────────────────────
const rhtPkgPath  = join(modules, 'react-hot-toast/package.json');
const rhtDistPath = join(modules, 'react-hot-toast/dist');

if (existsSync(rhtPkgPath)) {
  const pkg = JSON.parse(readFileSync(rhtPkgPath, 'utf8'));
  let changed = false;

  // Ensure exports point to CJS for the import field
  if (pkg.exports?.['.']?.import !== './dist/index.js') {
    if (pkg.exports?.['.']) {
      pkg.exports['.'].import = './dist/index.js';
      changed = true;
    }
  }
  if (pkg.exports?.['./headless']?.import && pkg.exports['./headless'].import !== './headless/index.js') {
    pkg.exports['./headless'].import = './headless/index.js';
    changed = true;
  }

  if (changed) {
    writeFileSync(rhtPkgPath, JSON.stringify(pkg, null, 2));
    console.log('✅ Patched react-hot-toast: exports → CJS index.js');
    fixes++;
  }
}

// ── 3. Create missing node-releases/data/release-schedule/release-schedule.json
const releaseScheduleDir  = join(modules, 'node-releases/data/release-schedule');
const releaseSchedulePath = join(releaseScheduleDir, 'release-schedule.json');

if (!existsSync(releaseSchedulePath)) {
  mkdirSync(releaseScheduleDir, { recursive: true });
  const schedule = {
    'v0.10': { start: '2013-03-11', end: '2016-10-31' },
    'v0.12': { start: '2015-02-06', end: '2016-12-31' },
    'v4':  { start: '2015-09-08', lts: '2015-10-12', maintenance: '2017-04-01', end: '2018-04-30', codename: 'Argon' },
    'v6':  { start: '2016-04-26', lts: '2016-10-18', maintenance: '2018-04-30', end: '2019-04-30', codename: 'Boron' },
    'v8':  { start: '2017-05-30', lts: '2017-10-31', maintenance: '2019-01-01', end: '2019-12-31', codename: 'Carbon' },
    'v10': { start: '2018-04-24', lts: '2018-10-30', maintenance: '2020-05-19', end: '2021-04-30', codename: 'Dubnium' },
    'v12': { start: '2019-04-23', lts: '2019-10-21', maintenance: '2020-11-30', end: '2022-04-30', codename: 'Erbium' },
    'v14': { start: '2020-04-21', lts: '2020-10-27', maintenance: '2021-10-19', end: '2023-04-30', codename: 'Fermium' },
    'v16': { start: '2021-04-20', lts: '2021-10-26', maintenance: '2022-10-18', end: '2023-09-11', codename: 'Gallium' },
    'v18': { start: '2022-04-19', lts: '2022-10-25', maintenance: '2023-10-18', end: '2025-04-30', codename: 'Hydrogen' },
    'v20': { start: '2023-04-18', lts: '2023-10-24', maintenance: '2024-10-22', end: '2026-04-30', codename: 'Iron' },
    'v22': { start: '2024-04-24', lts: '2024-10-29', maintenance: '2025-10-21', end: '2027-04-30', codename: 'Jod' },
  };
  writeFileSync(releaseSchedulePath, JSON.stringify(schedule, null, 2));
  console.log('✅ Created node-releases release-schedule.json');
  fixes++;
}

if (fixes === 0) {
  console.log('✓ All dashboard build deps already fixed — nothing to do.');
} else {
  console.log(`\n✅ Applied ${fixes} fix(es). Dashboard is ready to build.`);
}
