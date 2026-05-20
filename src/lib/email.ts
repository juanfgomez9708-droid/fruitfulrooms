import { EMPLOYMENT_OPTIONS, INCOME_OPTIONS, REFERRAL_SOURCE_OPTIONS, CONTACT_METHOD_OPTIONS } from "./constants";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = "rentals@fruitfulhomeoffers.com";

function employmentLabel(value: string): string {
  return EMPLOYMENT_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function incomeLabel(value: string): string {
  return INCOME_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function referralLabel(value: string): string {
  return REFERRAL_SOURCE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function contactMethodLabel(value: string): string {
  return CONTACT_METHOD_OPTIONS.find((o) => o.value === value)?.label ?? value;
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
  current_city?: string | null;
  referral_source?: string | null;
  preferred_contact?: string | null;
  job_title?: string | null;
  job_length?: string | null;
  has_vehicle?: string | null;
  preferred_tour_date?: string | null;
  room_number: string;
  property_name: string;
}): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log("[email] RESEND_API_KEY not set — skipping inquiry email notification");
    return;
  }

  const isWholeHouse = inquiry.room_number === "Whole House";
  const heading = isWholeHouse
    ? `New Inquiry — ${inquiry.property_name} (Whole House)`
    : `New Inquiry — ${inquiry.property_name}, ${inquiry.room_number}`;

  const html = `
<h2>${heading}</h2>

<h3>Applicant</h3>
<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Name</td><td>${inquiry.name}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Email</td><td><a href="mailto:${inquiry.email}">${inquiry.email}</a></td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Phone</td><td><a href="tel:${inquiry.phone}">${inquiry.phone}</a></td></tr>
  ${inquiry.current_city ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Current City</td><td>${inquiry.current_city}</td></tr>` : ""}
  ${inquiry.preferred_contact ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Preferred Contact</td><td>${contactMethodLabel(inquiry.preferred_contact)}</td></tr>` : ""}
  ${inquiry.referral_source ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">How They Found Us</td><td>${referralLabel(inquiry.referral_source)}</td></tr>` : ""}
</table>

<h3>Employment & Income</h3>
<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Employment</td><td>${employmentLabel(inquiry.employment_status)}</td></tr>
  ${inquiry.job_title ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Job Title</td><td>${inquiry.job_title}</td></tr>` : ""}
  ${inquiry.job_length ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Job Length</td><td>${inquiry.job_length}</td></tr>` : ""}
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Monthly Income</td><td>${incomeLabel(inquiry.income_range)}</td></tr>
</table>

<h3>Screening</h3>
<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Desired Move-in</td><td>${inquiry.desired_move_in}</td></tr>
  ${inquiry.preferred_tour_date ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Tour Date</td><td>${inquiry.preferred_tour_date}</td></tr>` : ""}
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Occupants</td><td>${inquiry.occupants}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Pets</td><td>${inquiry.has_pets === "yes" ? "Yes" : "No"}</td></tr>
  ${inquiry.has_vehicle ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Vehicle</td><td>${inquiry.has_vehicle === "yes" ? "Yes" : "No"}</td></tr>` : ""}
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
        from: "Fruitful Rooms <team@fruitfulhomeoffers.com>",
        to: NOTIFY_EMAIL,
        subject: isWholeHouse
          ? `New Inquiry: ${inquiry.name} — ${inquiry.property_name} (Whole House)`
          : `New Inquiry: ${inquiry.name} — ${inquiry.property_name} ${inquiry.room_number}`,
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
