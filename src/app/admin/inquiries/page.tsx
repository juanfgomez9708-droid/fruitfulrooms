import Link from "next/link";
import { getInquiries } from "@/lib/actions";
import { INQUIRY_STATUS_COLORS } from "@/lib/constants";

export default async function InquiriesPage() {
  const inquiries = await getInquiries();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Inquiries</h1>
        <p className="text-gray-500 mt-1">
          {inquiries.length} {inquiries.length === 1 ? "inquiry" : "inquiries"} received
        </p>
      </div>

      {inquiries.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h2 className="text-lg font-semibold mb-1">No inquiries yet</h2>
          <p className="text-gray-500 text-sm">
            When prospective tenants apply through the website, their submissions will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Property / Room</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Move-in</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inquiry) => (
                <tr key={inquiry.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{inquiry.name}</div>
                    <div className="text-gray-500 text-xs">{inquiry.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{inquiry.property_name}</div>
                    <div className="text-gray-500 text-xs">{inquiry.room_number}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{inquiry.desired_move_in}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${INQUIRY_STATUS_COLORS[inquiry.status] ?? "bg-gray-100 text-gray-800"}`}>
                      {inquiry.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(inquiry.created_at + "Z").toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/inquiries/${inquiry.id}`}
                      className="text-blue-600 hover:underline text-sm font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
