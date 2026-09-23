import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { allOperations, routeFile } from "./contract-helper";

test("Every OpenAPI operation has exactly one route, with no undocumented methods", () => {
  const expected = allOperations();
  assert.equal(expected.length, 47);
  for (const { pathname, method } of expected) {
    const source = fs.readFileSync(routeFile(pathname), "utf8");
    assert.match(source, new RegExp(`export const ${method}\\b`), `${method} ${pathname}`);
    assert.doesNotMatch(source, /@\/prisma|@\/repository|generated\/prisma|\bPrismaClient\b/);
  }
  const root = path.resolve("src/app/api/v1");
  const files = fs.readdirSync(root, { recursive: true }).filter((entry): entry is string => typeof entry === "string" && entry.endsWith("route.ts"));
  assert.equal(files.length, new Set(expected.map(item => routeFile(item.pathname))).size);
  for (const file of files) {
    const absolute = path.join(root, file);
    const source = fs.readFileSync(absolute, "utf8");
    for (const match of source.matchAll(/export const (GET|POST|PUT|PATCH|DELETE)\b/g)) {
      assert.ok(expected.some(item => routeFile(item.pathname) === absolute && item.method === match[1]), absolute);
    }
  }
});

test("Services have no HTTP objects and repositories have no HTTP dependencies", () => {
  for (const directory of ["src/services", "src/repository"]) {
    for (const file of fs.readdirSync(directory).filter(file => file.endsWith(".ts"))) {
      const source = fs.readFileSync(path.join(directory, file), "utf8");
      assert.doesNotMatch(source, /from ["']next(?:\/|["'])|\bNextRequest\b|\bNextResponse\b/);
      assert.doesNotMatch(source, /:\s*any\b|as any\b/);
    }
  }
});
