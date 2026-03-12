import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getProperty, updateProperty } from "@/lib/actions";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await getProperty(Number(id));
  if (!property) notFound();

  async function handleUpdate(formData: FormData) {
    "use server";
    await updateProperty(Number(id), {
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      description: (formData.get("description") as string) || undefined,
      photo_url: (formData.get("photo_url") as string) || undefined,
    });
    redirect("/admin/properties");
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/admin/properties"
        className="mb-4 inline-block text-sm text-blue-600 hover:underline"
      >
        &larr; Back to Properties
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Edit Property</h1>

      <form action={handleUpdate} className="card space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
          <input
            name="name"
            required
            defaultValue={property.name}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Address *</label>
          <input
            name="address"
            required
            defaultValue={property.address}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">City *</label>
          <input
            name="city"
            required
            defaultValue={property.city}
            placeholder="e.g. Atlanta, GA"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            rows={3}
            defaultValue={property.description ?? ""}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Photo URL</label>
          <input
            name="photo_url"
            type="url"
            defaultValue={property.photo_url ?? ""}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Update Property
        </button>
      </form>
    </div>
  );
}
