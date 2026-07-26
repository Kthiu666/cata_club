/**
 * One focus indicator, used everywhere.
 *
 * `color-contrast.test.ts` proves the ring's colours can be seen. This proves
 * they are the ones actually on the controls: the yellow `outline-ball` ring
 * measured 1.42:1 on white, and it was spread across a dozen files by hand, so
 * the failure mode is not "the token is wrong" but "one screen kept the old
 * chain". A grep is the only test that catches that.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(__dirname, "..", "..");

function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "__tests__") continue;
      found.push(...sourceFiles(full));
      continue;
    }
    if (/\.(ts|tsx|css)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) found.push(full);
  }
  return found;
}

const FILES = sourceFiles(SRC).map((path) => ({
  path: path.slice(SRC.length + 1),
  text: readFileSync(path, "utf8"),
}));

describe("the focus indicator is the shared one", () => {
  it("finds source files to check at all", () => {
    // Guards the guard: a broken walk would make every assertion below vacuous.
    expect(FILES.length).toBeGreaterThan(50);
  });

  it("leaves no control wearing the yellow ring", () => {
    const offenders = FILES.filter(({ text }) =>
      /(?:focus-visible|focus-within):outline-ball/.test(text),
    ).map(({ path }) => path);

    expect(offenders).toEqual([]);
  });

  it("keeps `ball` available as a colour — only its use as a focus ring is banned", () => {
    // The yellow is still the brand's attention accent; it was never the
    // problem anywhere except as a 1.42:1 outline on white.
    const usesBall = FILES.some(({ text }) => /\bbg-ball\b|\btext-ball-ink\b/.test(text));
    expect(usesBall).toBe(true);
  });
});
