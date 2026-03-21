import { EMPLOYMENT_OPTIONS, INCOME_OPTIONS } from "./constants";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = "rentals@fruitfulhomeoffers.com";

function employmentLabel(value: string): string {
  return EMPLOYMENT_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function incomeLabel(value: string): string {
  return INCOME_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export async function sendInquiryEmail(inquiry: {
  name: string;
  email: string;
  phone: string;
  employment_status: string;
  income_range: string;
  desired_move_in: string;
  occupants: string;
  has_pets: string;
  background_check_consent: string;
  about: string | null;
  room_number: string;
  property_name: string;
}): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log("[email] RESEND_API_KEY not set — skipping inquiry email notification");
    return;
  }

  const html = `
<h2>New Inquiry — ${inquiry.property_name}, ${inquiry.room_number}</h2>

<h3>Applicant</h3>
<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Name</td><td>${inquiry.name}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Email</td><td><a href="mailto:${inquiry.email}">${inquiry.email}</a></td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Phone</td><td><a href="tel:${inquiry.phone}">${inquiry.phone}</a></td></tr>
</table>

<h3>Screening</h3>
<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Employment</td><td>${employmentLabel(inquiry.employment_status)}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Monthly Income</td><td>${incomeLabel(inquiry.income_range)}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Desired Move-in</td><td>${inquiry.desired_move_in}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Occupants</td><td>${inquiry.occupants === "1" ? "Just me" : "2 people"}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Pets</td><td>${inquiry.has_pets === "yes" ? "Yes" : "No"}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Background Check</td><td>${inquiry.background_check_consent === "yes" ? "Yes" : "No"}</td></tr>
</table>

${inquiry.about ? `<h3>About</h3><p style="font-family:sans-serif;font-size:14px;">${inquiry.about.replace(/\n/g, "<br>")}</p>` : ""}

<hr style="margin-top:24px;border:none;border-top:1px solid #ddd;">
<p style="font-family:sans-serif;font-size:12px;color:#888;">
  This inquiry was submitted on fruitfulrooms.com and saved to the admin panel.
</p>
`.trim();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Fruitful Rooms <onboarding@resend.dev>",
        to: NOTIFY_EMAIL,
        subject: `New Inquiry: ${inquiry.name} — ${inquiry.property_name} ${inquiry.room_number}`,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[email] Resend API error:", res.status, body);
    }
  } catch (err) {
    console.error("[email] Failed to send inquiry notification:", err);
  }
}
