import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

test("a shared cache does not reuse a summary from a different session path", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "brain-index-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const seed = (name, content) => {
    const root = join(dir, name);
    const project = join(root, "project");
    mkdirSync(project, { recursive: true });
    const file = join(project, "abcdef12.jsonl");
    writeFileSync(file, JSON.stringify({ type: "user", message: { content } }) + "\n");
    utimesSync(file, 1_700_000_000, 1_700_000_000);
    return { root, file };
  };
  const first = seed("first", "First session");
  const other = seed("other", "Other session");
  const fingerprint = ({ file }) => {
    const { size, mtimeMs } = statSync(file);
    return [size, mtimeMs];
  };
  assert.deepEqual(fingerprint(first), fingerprint(other));

  const list = ({ root }) => execFileSync(process.execPath, [
    fileURLToPath(new URL("../bin/brain.mjs", import.meta.url)),
    "list",
  ], {
    encoding: "utf8",
    env: { ...process.env, BRAIN_CLAUDE_DIR: root, BRAIN_CACHE: join(dir, "index.json") },
    timeout: 5000,
  });
  assert.match(list(first), /First session/);
  assert.match(list(other), /Other session/);
});
