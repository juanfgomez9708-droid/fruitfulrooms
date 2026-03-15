import { redirect } from "next/navigation";
import Link from "next/link";
import { getInquiry, updateInquiryStatus } from "@/lib/actions";
import { EMPLOYMENT_OPTIONS, INCOME_OPTIONS, INQUIRY_STATUS_COLORS, INQUIRY_STATUSES } from "@/lib/constants";

const employmentLabels = Object.fromEntries(EMPLOYMENT_OPTIONS.map((o) => [o.value, o.label]));
const incomeLabels = Object.fromEntries(INCOME_OPTIONS.map((o) => [o.value, o.label]));

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const inquiry = await getInquiry(Number(id));

  if (!inquiry) {
    redirect("/admin/inquiries");
  }

  async function setStatus(formData: FormData) {
    "use server";
    const status = formData.get("status") as string;
    await updateInquiryStatus(Number(id), status);
    redirect(`/admin/inquiries/${id}`);
  }

  return (
    <div>
      <Link
        href="/admin/inquiries"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        ← Back to Inquiries
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Applicant Info */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold">{inquiry.name}</h1>
                <p className="text-gray-500 text-sm mt-1">
                  Applied for {inquiry.room_number} at {inquiry.property_name} — {inquiry.property_city}
                </p>
              </div>
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium capitalize ${INQUIRY_STATUS_COLORS[inquiry.status] ?? "bg-gray-100 text-gray-800"}`}>
                {inquiry.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block">Email</span>
                <a href={`mailto:${inquiry.email}`} className="text-blue-600 hover:underline">{inquiry.email}</a>
              </div>
              <div>
                <span className="text-gray-500 block">Phone</span>
                <a href={`tel:${inquiry.phone}`} className="text-blue-600 hover:underline">{inquiry.phone}</a>
              </div>
              <div>
                <span className="text-gray-500 block">Room Price</span>
                <span className="font-medium">${inquiry.room_price}/week</span>
              </div>
            </div>
          </div>

          {/* Screening Answers */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Screening Answers</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg bg-gray-50 p-4">
                <span className="text-gray-500 block mb-1">Employment Status</span>
                <span className="font-medium">{employmentLabels[inquiry.employment_status] ?? inquiry.employment_status}</span>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <span className="text-gray-500 block mb-1">Monthly Income</span>
                <span className="font-medium">{incomeLabels[inquiry.income_range] ?? inquiry.income_range}</span>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <span className="text-gray-500 block mb-1">Desired Move-in</span>
                <span className="font-medium">{inquiry.desired_move_in}</span>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <span className="text-gray-500 block mb-1">Occupants</span>
                <span className="font-medium">{inquiry.occupants === "1" ? "Just them" : "2 people"}</span>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <span className="text-gray-500 block mb-1">Pets</span>
                <span className={`font-medium ${inquiry.has_pets === "yes" ? "text-amber-600" : ""}`}>
                  {inquiry.has_pets === "yes" ? "Yes" : "No"}
                </span>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <span className="text-gray-500 block mb-1">Background Check Consent</span>
                <span className={`font-medium ${inquiry.background_check_consent === "no" ? "text-red-600" : "text-green-600"}`}>
                  {inquiry.background_check_consent === "yes" ? "Yes" : "No"}
                </span>
              </div>
            </div>

            {inquiry.about && (
              <div className="mt-4 rounded-lg bg-gray-50 p-4">
                <span className="text-gray-500 block mb-1 text-sm">About Themselves</span>
                <p className="text-sm whitespace-pre-wrap">{inquiry.about}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar — Status Update */}
        <div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 sticky top-8">
            <h2 className="text-lg font-semibold mb-4">Update Status</h2>
            <form action={setStatus} className="space-y-3">
              <select
                name="status"
                defaultValue={inquiry.status}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {INQUIRY_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Update Status
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500">
              <p>Submitted: {new Date(inquiry.created_at + "Z").toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
