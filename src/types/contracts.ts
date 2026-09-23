import { z } from "zod";
import { dateSchema, idSchema, moneySchema, nameSchema, nonempty, paginationSchema, pathIdSchema, queryBooleanSchema } from "./common";

export const contractStatusSchema = z.enum(["draft", "pending_approval", "active", "completed", "cancelled"]);
export const billingFrequencySchema = z.enum(["one_time", "weekly", "monthly", "quarterly", "semi_annually", "annually"]);
export const createContractSchema = z.strictObject({
  customerId: idSchema, title: nameSchema, description: z.string().max(2000).nullable().optional(),
  startDate: dateSchema, expirationDate: dateSchema, contractValue: moneySchema, billingFrequency: billingFrequencySchema,
}).refine(value => value.expirationDate > value.startDate, { message: "Expiration date must be after start date.", path: ["expirationDate"] });
export const updateContractSchema = z.strictObject({ title: nameSchema.optional(), expirationDate: dateSchema.optional(), contractValue: moneySchema.optional() }).refine(nonempty, "Supply at least one field.");
export const customerContractQuerySchema = paginationSchema.safeExtend({ status: contractStatusSchema.optional(), archived: queryBooleanSchema.default(false) });
export const contractQuerySchema = customerContractQuerySchema.safeExtend({ customerId: pathIdSchema.optional() });
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type ContractQuery = z.infer<typeof contractQuerySchema>;
