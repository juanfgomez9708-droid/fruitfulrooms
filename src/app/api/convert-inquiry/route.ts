import { requireAuth } from "@/lib/auth";
import { convertInquiryToTenant } from "@/lib/actions";

export async function POST(req: Request) {
  try {
    await requireAuth();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { inquiry_id, room_id, move_in_date, initial_fee, monthly_fee } = body;

    if (!inquiry_id || !room_id || !move_in_date || monthly_fee === undefined) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const tenantId = await convertInquiryToTenant({
      inquiry_id: Number(inquiry_id),
      room_id: Number(room_id),
      move_in_date,
      initial_fee: Number(initial_fee) || 0,
      monthly_fee: Number(monthly_fee),
    });

    return Response.json({ success: true, tenantId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Conversion failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
