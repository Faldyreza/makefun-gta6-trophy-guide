// GTA VI Trophy Guide & Tracker — entry program (Node 22, standard library only).
//
// Hands the guide in: copies app/ and screenshots/ from this repository into the
// output directory and writes /output/dossier.json with buildDossier from the kit's
// vendor/makefun-frontend.ts. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for
// /output. The output directory is never deleted: files are copied over it, so a
// second run writes the same bytes as the first.

import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || "/output";

// The gate's caps for this bounty (competition.yaml / reference/gate.json).
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
};

function copyTree(sourceDir: string, targetDir: string): number {
  mkdirSync(targetDir, { recursive: true });
  let copied = 0;
  for (const entry of readdirSync(sourceDir)) {
    const from = join(sourceDir, entry);
    const to = join(targetDir, entry);
    if (statSync(from).isDirectory()) {
      copied += copyTree(from, to);
    } else {
      copyFileSync(from, to);
      copied++;
    }
  }
  return copied;
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

const appFiles = copyTree(join(REPO_ROOT, "app"), join(OUTPUT_DIR, "app"));
const shotFiles = copyTree(join(REPO_ROOT, "screenshots"), join(OUTPUT_DIR, "screenshots"));

const dossier = buildDossier(OUTPUT_DIR, DOSSIER_CAPS);
writeFileSync(join(OUTPUT_DIR, "dossier.json"), dossier);

console.log(
  `gta6-trophy-guide v3: ${appFiles} app files, ${shotFiles} screenshots, ` +
    `dossier ${dossier.length} bytes, sha256 ${sha256Hex(dossier)}`
);
