import { z } from "zod";
import { emailSchema } from "./common";

/**This defines exactly what the login API accepts. */
export const loginSchema = z.strictObject({ email: emailSchema, password: z.string().min(1) });
export type LoginInput = z.infer<typeof loginSchema>;
