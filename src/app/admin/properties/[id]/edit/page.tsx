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
    const rentalType = formData.get("rental_type") as string || property!.rental_type;
    await updateProperty(Number(id), {
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      description: (formData.get("description") as string) || undefined,
      photo_url: (formData.get("photo_url") as string) || undefined,
      rental_type: rentalType,
      bedrooms: Number(formData.get("bedrooms")) || undefined,
      bathrooms: Number(formData.get("bathrooms")) || undefined,
      price: Number(formData.get("price")) || undefined,
      status: (formData.get("status") as string) || undefined,
      lease_minimum: (formData.get("lease_minimum") as string) || undefined,
      utilities_included: formData.get("utilities_included") === "true",
    });
    redirect("/admin/properties");
  }

  const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

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
          <label className="mb-1 block text-sm font-medium text-gray-700">Rental Type *</label>
          <select name="rental_type" required className={inputClass} defaultValue={property.rental_type}>
            <option value="co-living">Co-Living (rooms)</option>
            <option value="whole-house">Whole House</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
          <input name="name" required defaultValue={property.name} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Address *</label>
          <input name="address" required defaultValue={property.address} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">City *</label>
          <input name="city" required defaultValue={property.city} placeholder="e.g. Daytona Beach, FL" className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea name="description" rows={3} defaultValue={property.description ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Photo URL</label>
          <input name="photo_url" type="text" defaultValue={property.photo_url ?? ""} className={inputClass} />
        </div>

        {/* Whole-house fields */}
        <fieldset className="border border-gray-200 rounded-lg p-4 space-y-4">
          <legend className="text-sm font-medium text-gray-500 px-2">Whole House Details</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Bedrooms</label>
              <input name="bedrooms" type="number" min="1" defaultValue={property.bedrooms ?? ""} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Bathrooms</label>
              <input name="bathrooms" type="number" min="1" defaultValue={property.bathrooms ?? ""} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Monthly Rent ($)</label>
            <input name="price" type="number" min="0" step="0.01" defaultValue={property.price ?? ""} className={inputClass} />
          </div>
          {property.rental_type === "whole-house" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              <select name="status" className={inputClass} defaultValue={property.status ?? "available"}>
                <option value="available">Available</option>
                <option value="rented">Rented</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Minimum Lease</label>
            <input name="lease_minimum" type="text" placeholder="e.g. 6 months" defaultValue={property.lease_minimum ?? ""} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Utilities Included?</label>
            <select name="utilities_included" className={inputClass} defaultValue={property.utilities_included ? "true" : "false"}>
              <option value="true">Yes (included in rent)</option>
              <option value="false">No (tenant pays)</option>
            </select>
          </div>
        </fieldset>

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
