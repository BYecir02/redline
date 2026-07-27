import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { readDirTree } from "./dirTree.js";

let root: string;

beforeAll(() => {
  root = path.join(os.tmpdir(), "redline-tree-" + Date.now());
  // Structure : src/{components,utils}, tests, node_modules (ignoré), + un fichier.
  mkdirSync(path.join(root, "src", "components"), { recursive: true });
  mkdirSync(path.join(root, "src", "utils"), { recursive: true });
  mkdirSync(path.join(root, "tests"), { recursive: true });
  mkdirSync(path.join(root, "node_modules", "left-pad"), { recursive: true });
  writeFileSync(path.join(root, "src", "index.ts"), "export {}");
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("readDirTree", () => {
  it("lit l'arbre des dossiers en profondeur, fichiers exclus", () => {
    const tree = readDirTree(root);
    const names = tree.map((n) => n.name);

    expect(names).toContain("src");
    expect(names).toContain("tests");
    // Fichier index.ts absent (dossiers uniquement).
    expect(names).not.toContain("index.ts");

    const src = tree.find((n) => n.name === "src");
    const srcChildren = src?.children.map((c) => c.name) ?? [];
    expect(srcChildren).toEqual(["components", "utils"]); // trié
  });

  it("ignore node_modules (et consorts)", () => {
    const tree = readDirTree(root);
    expect(tree.map((n) => n.name)).not.toContain("node_modules");
  });
});
