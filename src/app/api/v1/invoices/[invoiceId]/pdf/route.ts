import { apiHandler, requireActor } from "@/app/api/_lib/http";
import { invoiceParamsSchema } from "@/types/common";
import { invoicePdf } from "@/services/invoice-pdf";

export const runtime = "nodejs";
export const GET = apiHandler(async (request, context) => {
  const actor = await requireActor(request);
  const { invoiceId } = invoiceParamsSchema.parse(await context.params);
  const { bytes, filename } = await invoicePdf(actor, invoiceId);
  return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" } });
});
