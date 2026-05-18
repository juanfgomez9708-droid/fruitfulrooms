import { EMPLOYMENT_OPTIONS, INCOME_OPTIONS } from "./constants";

// Read env vars lazily at call time (not import time) to avoid Docker build issues
function getApiKey(): string | undefined { return process.env.GHL_API_KEY; }
function getLocationId(): string | undefined { return process.env.GHL_LOCATION_ID; }
const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

// GHL custom field IDs for Fruitful Rooms (location BH2dG8oRlvqBFqT5UVOD)
const CUSTOM_FIELDS = {
  COLIVING_DESIRED_CITY: "H2JtYZ5b388JguVHkdFs",
  JOB: "QwWFnFVcLxbShMazn3sF",
  JOB_LENGTH: "vdWqMZOfAisSJGoq2PJW",
  MONTHLY_INCOME: "wfack1Nice6nHx9aO0hf",
  MOVE_IN_DATE: "i7CSEJvs2D7yZA9tDnDY",
  PETS: "dDkC4isSZkfQVnlG8F8s",
  VEHICLE: "KrrvVQwkiAfTh5UVfBcW",
  ROOM: "rqvcpDuKN2PsvVfHPKiq",
};

// Map property city to GHL Co-Living Desired City option values
const CITY_MAP: Record<string, string> = {
  "Orlando, FL": "Orlando",
  "Daytona Beach, FL": "Daytona Beach",
  "Mulberry, FL": "Mulberry",
  "Ormond Beach, FL": "Ormond Beach",
};

function formatPhone(phone: string): string {
  // Strip to digits only
  const digits = phone.replace(/\D/g, "");
  // Remove leading 1 if 11 digits (US country code)
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  // Format as (XXX) XXX-XXXX if 10 digits
  if (local.length === 10) {
    return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  }
  return phone; // Return as-is if not a standard 10-digit US number
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function employmentLabel(value: string): string {
  return EMPLOYMENT_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function incomeLabel(value: string): string {
  return INCOME_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function incomeToNumber(value: string): number {
  switch (value) {
    case "0_1000": return 500;
    case "1000_2000": return 1500;
    case "2000_3000": return 2500;
    case "3000_plus": return 3000;
    default: return 0;
  }
}

async function ghlRequest(endpoint: string, options: { method?: string; body?: unknown } = {}): Promise<Response> {
  const { method = "GET", body } = options;
  return fetch(`${GHL_API_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      Version: GHL_API_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function searchContact(query: string): Promise<{ id: string } | null> {
  const res = await ghlRequest(`/contacts/?locationId=${getLocationId()}&query=${encodeURIComponent(query)}`);
  if (!res.ok) return null;
  const data = await res.json();
  const contacts = data.contacts ?? [];
  return contacts.length > 0 ? { id: contacts[0].id } : null;
}

export async function createOrUpdateGHLContact(inquiry: {
  name: string;
  email: string;
  phone: string;
  current_city?: string | null;
  referral_source?: string | null;
  preferred_contact?: string | null;
  employment_status: string;
  job_title?: string | null;
  job_length?: string | null;
  income_range: string;
  desired_move_in: string;
  occupants: string;
  has_pets: string;
  has_vehicle?: string | null;
  background_check_consent: string;
  preferred_tour_date?: string | null;
  about?: string | null;
  room_number: string;
  property_name: string;
  property_city: string;
}): Promise<{ contactId: string } | null> {
  if (!getApiKey() || !getLocationId()) {
    console.log("[ghl] GHL_API_KEY or GHL_LOCATION_ID not set — skipping GHL contact creation");
    return null;
  }

  const { firstName, lastName } = splitName(inquiry.name);

  // Build job description from employment status + job title
  const jobParts: string[] = [];
  jobParts.push(employmentLabel(inquiry.employment_status));
  if (inquiry.job_title) jobParts.push(`— ${inquiry.job_title}`);
  const jobValue = jobParts.join(" ");

  // Map property city to GHL option
  const desiredCity = CITY_MAP[inquiry.property_city] ?? inquiry.property_city?.replace(/, FL$/, "") ?? "";

  // Build custom fields array
  const customFields: { id: string; value: string | number | string[] }[] = [
    { id: CUSTOM_FIELDS.JOB, value: jobValue },
    { id: CUSTOM_FIELDS.MONTHLY_INCOME, value: incomeToNumber(inquiry.income_range) },
    { id: CUSTOM_FIELDS.MOVE_IN_DATE, value: inquiry.desired_move_in },
    { id: CUSTOM_FIELDS.PETS, value: inquiry.has_pets === "yes" ? "Yes" : "No" },
    { id: CUSTOM_FIELDS.ROOM, value: `Room #${inquiry.room_number.replace(/^Room\s*/i, "")}` },
  ];

  if (desiredCity) {
    customFields.push({ id: CUSTOM_FIELDS.COLIVING_DESIRED_CITY, value: [desiredCity] });
  }
  if (inquiry.job_length) {
    customFields.push({ id: CUSTOM_FIELDS.JOB_LENGTH, value: inquiry.job_length });
  }
  if (inquiry.has_vehicle) {
    customFields.push({ id: CUSTOM_FIELDS.VEHICLE, value: inquiry.has_vehicle === "yes" ? "Yes" : "No" });
  }

  const tags = ["Fruitful Rooms", "Website Inquiry", "Co Living Lead", "Notify - Juan", inquiry.property_name].filter(Boolean);

  const contactBody = {
    firstName,
    lastName,
    email: inquiry.email,
    phone: formatPhone(inquiry.phone),
    city: inquiry.current_city || undefined,
    source: inquiry.referral_source || "Website",
    locationId: getLocationId(),
    tags,
    customFields,
  };

  try {
    // Search for existing contact (dedup by email, then phone)
    let existing = await searchContact(inquiry.email);
    if (!existing) {
      existing = await searchContact(inquiry.phone);
    }
    let contactId: string;

    if (existing) {
      // Update existing contact
      const res = await ghlRequest(`/contacts/${existing.id}`, {
        method: "PUT",
        body: contactBody,
      });
      if (!res.ok) {
        const body = await res.text();
        console.error("[ghl] Failed to update contact:", res.status, body);
        return null;
      }
      contactId = existing.id;
    } else {
      // Create new contact
      const res = await ghlRequest("/contacts/", {
        method: "POST",
        body: contactBody,
      });

      if (!res.ok) {
        const resBody = await res.json().catch(() => ({}));
        // Handle GHL duplicate prevention — location blocks duplicate contacts
        if (res.status === 400 && resBody.meta?.contactId) {
          console.log("[ghl] Duplicate detected, updating existing contact:", resBody.meta.contactId);
          contactId = resBody.meta.contactId;
          // Update the existing contact with our data
          await ghlRequest(`/contacts/${contactId}`, {
            method: "PUT",
            body: contactBody,
          });
        } else {
          console.error("[ghl] Failed to create contact:", res.status, JSON.stringify(resBody));
          return null;
        }
      } else {
        const data = await res.json();
        contactId = data.contact?.id;
        if (!contactId) {
          console.error("[ghl] No contact ID in response");
          return null;
        }
      }
    }

    // Add a combined note with all screening details
    const noteLines: string[] = [
      `Fruitful Rooms Inquiry — ${inquiry.property_name} ${inquiry.room_number}`,
      `Submitted: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      "",
      `Employment: ${employmentLabel(inquiry.employment_status)}`,
    ];
    if (inquiry.job_title) noteLines.push(`Job Title: ${inquiry.job_title}`);
    if (inquiry.job_length) noteLines.push(`Job Length: ${inquiry.job_length}`);
    noteLines.push(`Monthly Income: ${incomeLabel(inquiry.income_range)}`);
    noteLines.push(`Desired Move-in: ${inquiry.desired_move_in}`);
    if (inquiry.preferred_tour_date) noteLines.push(`Preferred Tour Date: ${inquiry.preferred_tour_date}`);
    noteLines.push(`Occupants: ${inquiry.occupants === "1" ? "Just me" : "2 people"}`);
    noteLines.push(`Pets: ${inquiry.has_pets === "yes" ? "Yes" : "No"}`);
    if (inquiry.has_vehicle) noteLines.push(`Vehicle: ${inquiry.has_vehicle === "yes" ? "Yes" : "No"}`);
    noteLines.push(`Background Check Consent: ${inquiry.background_check_consent === "yes" ? "Yes" : "No"}`);
    if (inquiry.preferred_contact) noteLines.push(`Preferred Contact: ${inquiry.preferred_contact}`);
    if (inquiry.referral_source) noteLines.push(`Referral Source: ${inquiry.referral_source}`);
    if (inquiry.about) {
      noteLines.push("");
      noteLines.push(`About: ${inquiry.about}`);
    }

    await ghlRequest(`/contacts/${contactId}/notes`, {
      method: "POST",
      body: { body: noteLines.join("\n") },
    });

    console.log(`[ghl] Contact ${existing ? "updated" : "created"}: ${contactId}`);
    return { contactId };
  } catch (err) {
    console.error("[ghl] Error creating/updating contact:", err);
    return null;
  }
}
