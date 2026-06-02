import { requireAuth } from "@/lib/auth";
import { getTenantWithAgreementData } from "@/lib/actions";
import { generateAgreementPDF } from "@/lib/agreement/generate";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    await requireAuth();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { tenantId } = await params;
  const tenant = await getTenantWithAgreementData(Number(tenantId));
  if (!tenant) {
    return new Response("Tenant not found", { status: 404 });
  }

  const startDate = tenant.move_in_date
    ? new Date(tenant.move_in_date + "T00:00:00").toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "2-digit",
      })
    : "_______________";

  const pdfBuffer = await generateAgreementPDF({
    memberName: tenant.name,
    memberEmail: tenant.email ?? "",
    memberPhone: tenant.phone ?? "",
    propertyAddress: tenant.property_address,
    roomNumber: tenant.room_number,
    startDate,
    initialFee: tenant.initial_fee ?? 0,
    monthlyFee: tenant.monthly_fee ?? 0,
  });

  const safeName = tenant.name.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-");
  return new Response(pdfBuffer.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Membership-Agreement-${safeName}.pdf"`,
    },
  });
}
