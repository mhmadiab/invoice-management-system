import { z } from "zod";
import { parse, stringify, LosslessNumber } from "lossless-json";
import { Prisma } from "@/app/generated/prisma/client";
import { ApplicationError } from "@/types/errors";
import type { Actor } from "@/types/context";
import { emptyParamsSchema, emptyQuerySchema } from "@/types/common";
import { authenticate } from "@/services/auth";
import { persistenceError } from "@/repository/transaction";


//Serialization function for values coming from Prisma/Services to use in Json API response
function jsonValue(value: unknown): unknown {
  if (value instanceof Prisma.Decimal) return new LosslessNumber(value.toString());
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(jsonValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, jsonValue(child)]));
  return value;
}

//create Header and return Response with serialized value valid for API Json 
export function json(body: unknown, status = 200, headers?: HeadersInit) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  responseHeaders.set("Cache-Control", "no-store");
  return new Response(stringify(jsonValue(body)), { status, headers: responseHeaders });
}

//Read and Validate Json Request Body 
export async function readBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try { body = parse(await request.text()); }
  catch { throw new ApplicationError("validation", "VALIDATION_ERROR", "The request contains invalid data.", [{ field: "body", message: "A valid JSON body is required." }]); }
  return schema.parse(body);
}


//Central error handler for the API Will return error Response as Json
export function errorResponse(caught: unknown): Response {
  const error = persistenceError(caught);
  if (error instanceof z.ZodError) {
    return json({ status: 400, code: "VALIDATION_ERROR", message: "The request contains invalid data.", errors: error.issues.map(issue => ({ field: issue.path.join(".") || "request", message: issue.message })) }, 400);
  }
  if (error instanceof ApplicationError) {
    const status = { validation: 400, unauthorized: 401, forbidden: 403, not_found: 404, conflict: 409, locked: 423, unprocessable: 422 }[error.kind];
    return json({ status, code: error.code, message: error.message, ...(error.kind === "validation" ? { errors: error.fields ?? [{ field: "request", message: error.message }] } : {}) }, status);
  }
  // Never log request bodies, credentials, database errors, or provider responses.
  console.error("API request failed", { category: error instanceof Error ? error.name : "UnknownError" });
  return json({ status: 500, code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." }, 500);
}

//this will contain the params passed by the URL ex. GET /api/v1/customers/25 ==> 25
export type HttpContext = { params: Promise<Record<string, string>> };

//Run the API code. If anything throws an error, catch it and convert it into a proper HTTP response
export function apiHandler(handler: (request: Request, context: HttpContext) => Promise<Response>) {
  return async (request: Request, context: HttpContext = { params: Promise.resolve({}) }): Promise<Response> => {
    try { return await handler(request, context); }
    catch (error) { return errorResponse(error); }
  };
}


//Get header for request, verify bearer was supplied, extract token and pass it to authenticate 
//Only validate if Http provide access token  
export async function requireActor(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer ([^\s]+)$/i)?.[1];
  return authenticate(token);
}


//Generic Route FACTORY
export function route<P extends z.ZodType = typeof emptyParamsSchema, Q extends z.ZodType = typeof emptyQuerySchema, B extends z.ZodType = z.ZodUndefined>(
  schemas: { params?: P; query?: Q; body?: B; status?: number },
  action: (input: { actor: Actor; params: z.output<P>; query: z.output<Q>; body: z.output<B> }) => Promise<unknown>,
) {
  return apiHandler(async (request, context) => {
    const actor = await requireActor(request);
    const params = (schemas.params ?? emptyParamsSchema).parse(await context.params) as z.output<P>;
    const query = (schemas.query ?? emptyQuerySchema).parse(Object.fromEntries(new URL(request.url).searchParams)) as z.output<Q>;
    const body = (schemas.body ? await readBody(request, schemas.body) : undefined) as z.output<B>;
    return json(await action({ actor, params, query, body }), schemas.status);
  });
}
