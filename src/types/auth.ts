import { z } from "zod";
import { emailSchema } from "./common";

export const loginSchema = z.strictObject({ email: emailSchema, password: z.string().min(1) });
export type LoginInput = z.infer<typeof loginSchema>;
