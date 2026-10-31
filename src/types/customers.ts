import { z } from "zod";
import { emailSchema, nameSchema, nonempty, paginationSchema } from "./common";

/*validations points defining what endpoint must receive*/

export const customerTypeSchema = z.enum(["individual", "organization"]);
export const customerStatusSchema = z.enum(["active", "archived"]);
const customerShape = {
  name: nameSchema,
  email: emailSchema,
  phone: z.string().max(50).nullable().optional(),
  billingAddress: z.string().max(500).nullable().optional(),
  type: customerTypeSchema,
};
export const createCustomerSchema = z.strictObject({ ...customerShape, type: customerTypeSchema.default("individual") });
export const updateCustomerSchema = z.strictObject(customerShape).partial().refine(nonempty, "Supply at least one field.");
export const customerQuerySchema = paginationSchema.safeExtend({ search: z.string().min(1).max(200).optional(), status: customerStatusSchema.optional() });
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerQuery = z.infer<typeof customerQuerySchema>;
