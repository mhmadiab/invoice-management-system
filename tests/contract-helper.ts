import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { load } from "js-yaml";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

type Schema = Record<string, unknown>;
type ApiResponse = { $ref?: string; content?: Record<string, { schema: Schema }> };
export type ApiOperation = { operationId: string; requestBody?: { content: Record<string, { schema: Schema }> }; responses: Record<string, ApiResponse> };
export type PathItem = { parameters?: unknown[] } & Partial<Record<"get" | "post" | "put" | "patch" | "delete", ApiOperation>>;
export const spec = load(fs.readFileSync("Docs/invoice-management-system-api-v1-final.yaml", "utf8")) as { paths: Record<string, PathItem>; components: { schemas: Record<string, Schema>; responses: Record<string, ApiResponse> } };
const ajv = new Ajv2020({ strict: false, allErrors: true, multipleOfPrecision: 8 });
addFormats(ajv);
ajv.addFormat("int64", { type: "number", validate: Number.isInteger });
ajv.addFormat("double", { type: "number", validate: Number.isFinite });
ajv.addFormat("password", true);
ajv.addSchema({ $id: "urn:invoice:api", components: spec.components });

export function operation(pathname: string, method: string) {
  const item = spec.paths[pathname];
  const result = item?.[method.toLowerCase() as "get"];
  assert.ok(result, `Undocumented operation: ${method} ${pathname}`);
  return result;
}
export function assertResponse(pathname: string, method: string, status: number, body: unknown) {
  const definition = operation(pathname, method).responses[String(status)];
  assert.ok(definition, `Undocumented status ${status} for ${method} ${pathname}`);
  const response = definition.$ref ? spec.components.responses[definition.$ref.split("/").at(-1)!] : definition;
  const schema = response.content?.["application/json"]?.schema;
  if (!schema) return;
  const reference = schema.$ref;
  const validate = ajv.compile(typeof reference === "string" ? { $ref: `urn:invoice:api${reference}` } : schema);
  assert.equal(validate(body), true, JSON.stringify(validate.errors));
}
export function routeFile(pathname: string) {
  return path.resolve("src/app/api/v1", pathname.slice(1).replace(/\{([^}]+)\}/g, "[$1]"), "route.ts");
}
export function allOperations() {
  return Object.entries(spec.paths).flatMap(([pathname, item]) => ["get", "post", "put", "patch", "delete"].flatMap(method => {
    const definition = item[method as "get"];
    return definition ? [{ pathname, method: method.toUpperCase(), definition }] : [];
  }));
}
