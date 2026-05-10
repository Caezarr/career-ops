/**
 * Batch render driver — given a JSON of {id, composition, props}
 * entries, renders each as MP4 to ./out.
 *
 * Usage:
 *   pnpm batch                      # uses ./data/week-01.json
 *   pnpm batch ./data/my-week.json  # custom file
 *
 * Why this exists: the playbook calls for ~14 reels/week. Editing
 * 14 individual `defaultProps` blocks in Root.tsx is tedious and
 * conflict-prone. Instead, every Reel is a JSON entry — write the
 * weekly batch in one file, fire-and-forget the render, drop the
 * MP4s into Submagic for sub-titles, schedule. Total touch time
 * after the JSON is written: ~5 minutes.
 *
 * The script shells out to `remotion render` per entry. We don't
 * spin up Remotion's bundler ourselves — keeps this script under
 * 60 lines and stays compatible across @remotion/cli upgrades.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

interface Entry {
  id: string;
  composition: "HotTake" | "ListeRapide" | "VeriteMarche";
  props: Record<string, unknown>;
}

const DEFAULT_INPUT = "./data/week-01.json";
const OUT_DIR = resolve(process.cwd(), "out");

function main() {
  const inputPath = process.argv[2] ?? DEFAULT_INPUT;
  const raw = readFileSync(resolve(process.cwd(), inputPath), "utf8");
  const entries: Entry[] = JSON.parse(raw);

  if (!Array.isArray(entries) || entries.length === 0) {
    console.error("[batch] empty or invalid input file:", inputPath);
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  console.log(`[batch] rendering ${entries.length} reels → ${OUT_DIR}`);

  const failures: string[] = [];
  for (const [i, entry] of entries.entries()) {
    const out = resolve(OUT_DIR, `${entry.id}.mp4`);
    const propsArg = JSON.stringify(entry.props);
    console.log(`\n[${i + 1}/${entries.length}] ${entry.id} (${entry.composition})`);
    const result = spawnSync(
      "pnpm",
      [
        "exec",
        "remotion",
        "render",
        entry.composition,
        out,
        `--props=${propsArg}`,
        "--quiet",
      ],
      { stdio: "inherit", cwd: process.cwd() },
    );
    if (result.status !== 0) {
      failures.push(entry.id);
    }
  }

  console.log("\n[batch] done.");
  if (failures.length > 0) {
    console.error(`[batch] ${failures.length} failed: ${failures.join(", ")}`);
    process.exit(1);
  }
}

main();
