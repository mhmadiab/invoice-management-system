import { PrismaClient } from "@/app/generated/prisma/client";

const state = globalThis as unknown as { invoicePrisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (!state.invoicePrisma) {
    state.invoicePrisma = new PrismaClient();
  }
  return state.invoicePrisma;
}
