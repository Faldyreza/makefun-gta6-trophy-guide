// GTA VI trophy guide — entrypoint (Node 22, standard library only).
//
// Copies app/ and screenshots/ from beside this file into the output
// directory and writes output/dossier.json with buildDossier from the
// vendored make.fun library. The output directory is /output inside the
// grader, or MAKEFUN_OUTPUT_DIR when set (for local runs). The program
// never deletes the output directory: it only creates it and writes
// into it, so two runs over the same directory produce the same bytes.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The gate's caps for this bounty: text at most 160 KiB, 3 to 4 screenshots
// of at most 256 KiB each, app/ at most 993 entries and 48 MiB in all.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
};

const here = resolve(fileURLToPath(new URL('.', import.meta.url)));
const out = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

mkdirSync(out, { recursive: true });

const appDir = join(here, 'app');
if (!existsSync(appDir)) throw new Error('app/ is missing beside main.ts');
cpSync(appDir, join(out, 'app'), { recursive: true });

const shotsDir = join(here, 'screenshots');
if (existsSync(shotsDir)) {
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(out, CAPS);
writeFileSync(join(out, 'dossier.json'), dossier);
// Print a short receipt so two runs can be compared by eye as well as by
// byte: the dossier's sha256 and how many app files and screenshots went in.
const shotCount = existsSync(join(out, 'screenshots'))
  ? readdirSync(join(out, 'screenshots')).length
  : 0;
console.log('wrote ' + join(out, 'dossier.json') + ' (' + dossier.length + ' bytes)');
console.log('dossier sha256 ' +
  createHash('sha256').update(dossier).digest('hex') +
  ' · screenshots ' + shotCount);
