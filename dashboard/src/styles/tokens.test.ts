// @vitest-environment node
import { expect, test } from "vitest";
import { readFileSync } from "node:fs";

const tokensCss = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

type Tokens = Record<string, string>;

function declarations(block: string): Tokens {
  const tokens: Tokens = {};
  for (const [, name, value] of block.matchAll(/(--[\w-]+):\s*([^;]+);/g)) tokens[name] = value.trim();
  return tokens;
}

function blockBody(selectorPattern: RegExp): string {
  const match = tokensCss.match(selectorPattern);
  if (!match) throw new Error(`no block for ${selectorPattern}`);
  return match[1];
}

const base = declarations(blockBody(/^:root \{([^}]*)\}/m));
const systemDark = declarations(blockBody(/:root:where\(:not\(\[data-theme="light"\]\)\) \{([^}]*)\}/));
const forcedDark = declarations(blockBody(/:root\[data-theme="dark"\] \{([^}]*)\}/));

const light: Tokens = base;
const dark: Tokens = { ...base, ...forcedDark };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const themes = { light, dark };
const seriesNames = Object.keys(base).filter((name) => name.startsWith("--series-"));

test("the system-dark and forced-dark blocks define identical tokens", () => {
  expect(systemDark).toEqual(
    Object.fromEntries(Object.entries(forcedDark).filter(([name]) => name !== "color-scheme")),
  );
});

test("there are eight series colours", () => {
  expect(seriesNames).toHaveLength(8);
});

for (const [themeName, tokens] of Object.entries(themes)) {
  test(`${themeName}: every series colour has 3:1 contrast on the card surface`, () => {
    for (const name of seriesNames) {
      expect(contrast(tokens[name], tokens["--surface-1"]), `${name} on --surface-1`).toBeGreaterThanOrEqual(3);
    }
  });

  test(`${themeName}: text tokens have 4.5:1 contrast on page and card`, () => {
    for (const text of ["--text-primary", "--text-secondary", "--text-muted"]) {
      for (const surface of ["--page", "--surface-1"]) {
        expect(contrast(tokens[text], tokens[surface]), `${text} on ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
}
