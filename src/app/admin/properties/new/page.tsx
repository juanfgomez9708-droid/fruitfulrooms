import Link from "next/link";
import { redirect } from "next/navigation";
import { createProperty } from "@/lib/actions";

export default function NewPropertyPage() {
  async function handleCreate(formData: FormData) {
    "use server";
    const rentalType = formData.get("rental_type") as string || "co-living";
    await createProperty({
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      description: (formData.get("description") as string) || undefined,
      photo_url: (formData.get("photo_url") as string) || undefined,
      rental_type: rentalType,
      bedrooms: rentalType === "whole-house" ? Number(formData.get("bedrooms")) || undefined : undefined,
      bathrooms: rentalType === "whole-house" ? Number(formData.get("bathrooms")) || undefined : undefined,
      price: rentalType === "whole-house" ? Number(formData.get("price")) || undefined : undefined,
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
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Add Property</h1>

      <form action={handleCreate} className="card space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Rental Type *</label>
          <select name="rental_type" required className={inputClass} defaultValue="co-living">
            <option value="co-living">Co-Living (rooms)</option>
            <option value="whole-house">Whole House</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
          <input name="name" required className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Address *</label>
          <input name="address" required className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">City *</label>
          <input name="city" required placeholder="e.g. Daytona Beach, FL" className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea name="description" rows={3} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Photo URL</label>
          <input name="photo_url" type="text" className={inputClass} />
        </div>

        {/* Whole-house fields */}
        <fieldset className="border border-gray-200 rounded-lg p-4 space-y-4">
          <legend className="text-sm font-medium text-gray-500 px-2">Whole House Details (optional for co-living)</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Bedrooms</label>
              <input name="bedrooms" type="number" min="1" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Bathrooms</label>
              <input name="bathrooms" type="number" min="1" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Monthly Rent ($)</label>
            <input name="price" type="number" min="0" step="0.01" className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Minimum Lease</label>
            <input name="lease_minimum" type="text" placeholder="e.g. 6 months" className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Utilities Included?</label>
            <select name="utilities_included" className={inputClass} defaultValue="true">
              <option value="true">Yes (included in rent)</option>
              <option value="false">No (tenant pays)</option>
            </select>
          </div>
        </fieldset>

        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create Property
        </button>
      </form>
    </div>
  );
}
