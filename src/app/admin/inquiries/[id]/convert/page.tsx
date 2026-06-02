import { redirect } from "next/navigation";
import { getInquiry, getProperties, getVacantRooms } from "@/lib/actions";
import ConvertForm from "./ConvertForm";

export default async function ConvertInquiryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const inquiry = await getInquiry(Number(id));

  if (!inquiry) redirect("/admin/inquiries");
  if (inquiry.status === "converted" || inquiry.status === "rejected") {
    redirect(`/admin/inquiries/${id}`);
  }

  const [properties, vacantRooms] = await Promise.all([
    getProperties(),
    getVacantRooms(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <a
          href={`/admin/inquiries/${id}`}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          ← Back to Inquiry
        </a>
        <h1 className="mt-2 text-xl font-bold text-gray-900">
          Convert to Tenant
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Converting inquiry from <span className="font-medium">{inquiry.name}</span> into an active tenant with a membership agreement.
        </p>
      </div>

      <ConvertForm
        inquiry={inquiry}
        properties={properties}
        vacantRooms={vacantRooms}
      />
    </div>
  );
}
