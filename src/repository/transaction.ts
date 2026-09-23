import { Prisma } from "@/app/generated/prisma/client";
import { getPrisma } from "@/prisma/client";
import { ApplicationError } from "@/types/errors";

export type Database = Prisma.TransactionClient;

export async function transaction<T>(work: (database: Database) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await getPrisma().$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 15000,
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt >= 4) throw error;
    }
  }
}


//This function is Helper to translates Prisma errors into application errors
export function persistenceError(error: unknown): unknown {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return error;
  if (error.code === "P2002") {
    if (error.meta?.modelName === "Customer") {
      return new ApplicationError("conflict", "CUSTOMER_EMAIL_ALREADY_EXISTS", "A customer with this email already exists.");
    }
    return new ApplicationError("conflict", "RESOURCE_CONFLICT", "The operation conflicts with the current resource state.");
  }
  if (error.code === "P2003" || error.code === "P2034") {
    return new ApplicationError("conflict", "RESOURCE_CONFLICT", "The operation conflicts with the current resource state.");
  }
  if (error.code === "P2025") return new ApplicationError("not_found", "RESOURCE_NOT_FOUND", "The requested resource was not found.");
  return error;
}
