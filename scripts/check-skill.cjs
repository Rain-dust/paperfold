"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repo = path.join(__dirname, "..");
const slug = "radial-paper-diorama";
const skill = path.join(repo, "skills", slug);
const template = path.join(skill, "assets", "turning-garden");
const read = file => fs.readFileSync(file, "utf8");

const markdown = path.join(skill, "SKILL.md");
const frontmatter = read(markdown).match(/^---\r?\n([\s\S]*?)\r?\n---/);
assert.ok(frontmatter, "SKILL.md needs YAML frontmatter");
assert.equal(frontmatter[1].match(/^name:\s+(\S+)$/m)?.[1], slug);
assert.ok(/^description:\s+\S/m.test(frontmatter[1]), "SKILL.md needs a description");
assert.ok(read(path.join(skill, "agents", "openai.yaml")).includes("$" + slug));

for (const file of [
  markdown,
  path.join(repo, "README.md"),
  path.join(repo, "AGENTS.md"),
  path.join(skill, "references", "production.md"),
]) {
  for (const [, target] of read(file).matchAll(/\]\(([^\s)]+)\)/g)) {
    if (/^(https?:|#)/.test(target)) continue;
    const linked = path.resolve(path.dirname(file), decodeURIComponent(target.split("#")[0]));
    assert.ok(fs.existsSync(linked), `Missing link in ${path.relative(repo, file)}: ${target}`);
  }
}

const html = read(path.join(template, "index.html"));
for (const [, relative] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  assert.ok(!/^(?:[a-z]+:|\/)/i.test(relative), `Offline template uses a non-relative URL: ${relative}`);
  const file = path.join(template, relative);
  assert.ok(fs.statSync(file).size > 0);
  if (file.endsWith(".js")) new vm.Script(read(file), { filename: relative });
}
for (const audio of ["paw-foley.m4a", "touch-foley.m4a"]) {
  assert.ok(fs.statSync(path.join(template, audio)).size > 0);
}
new vm.Script(read(path.join(skill, "scripts", "render.cjs")), { filename: "render.cjs" });
console.log(`${slug}: skill metadata, links, and offline starter verified.`);
