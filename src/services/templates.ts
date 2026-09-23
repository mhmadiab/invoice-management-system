import { invalid } from "@/types/errors";

export const templatePlaceholders = ["businessName", "customerName", "customerEmail", "invoiceNumber", "issueDate", "dueDate", "total", "paidAmount", "remainingBalance", "paymentAmount", "contractTitle", "expirationDate", "notificationType"] as const;
const aliases: Record<string, string> = { business_name: "businessName", customer_name: "customerName", invoice_number: "invoiceNumber", remaining_balance: "remainingBalance" };
export function validateTemplate(template: { subject: string; body: string }) {
  for (const field of ["subject", "body"] as const) {
    const text = template[field];
    if (field === "subject" && /[\r\n]/.test(text)) invalid(field, "Subject must be a single line.");
    const remainder = text.replace(/{{\s*([A-Za-z_][A-Za-z0-9_]*)\s*}}/g, (_match, placeholder: string) => {
      if (!(templatePlaceholders as readonly string[]).includes(aliases[placeholder] ?? placeholder)) invalid(field, `Unsupported placeholder: ${placeholder}.`);
      return "";
    });
    if (remainder.includes("{{") || remainder.includes("}}")) invalid(field, "Invalid placeholder syntax.");
  }
}
export function renderTemplate(text: string, values: Record<string, string>) {
  return text.replace(/{{\s*([A-Za-z_][A-Za-z0-9_]*)\s*}}/g, (_match, placeholder: string) => values[aliases[placeholder] ?? placeholder] ?? "");
}
