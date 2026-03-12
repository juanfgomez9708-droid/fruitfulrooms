import { NextResponse } from "next/server";
import { markPaymentPaid } from "@/lib/actions";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payment = await markPaymentPaid(Number(id));

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  return NextResponse.json(payment);
}
