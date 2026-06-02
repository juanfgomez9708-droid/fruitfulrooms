"use client";

import { useState } from "react";
import type { Inquiry, Property, Room } from "@/lib/types";

interface ConvertFormProps {
  inquiry: Inquiry & { room_number: string; property_name: string; room_price: number; property_city: string };
  properties: Property[];
  vacantRooms: (Room & { property_name: string; property_city: string })[];
}

export default function ConvertForm({ inquiry, properties, vacantRooms }: ConvertFormProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | "">(inquiry.property_id ?? "");
  const [selectedRoomId, setSelectedRoomId] = useState<number | "">(inquiry.room_id ?? "");
  const [monthlyFee, setMonthlyFee] = useState<string>(inquiry.room_price?.toString() ?? "");
  const [initialFee, setInitialFee] = useState<string>("0");
  const [startDate, setStartDate] = useState<string>(inquiry.desired_move_in ?? "");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [payStubFile, setPayStubFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ tenantId: number } | null>(null);

  // Filter rooms by selected property
  const filteredRooms = selectedPropertyId
    ? vacantRooms.filter((r) => r.property_id === selectedPropertyId)
    : vacantRooms;

  // When property changes, reset room if it doesn't belong to the new property
  function handlePropertyChange(propId: number | "") {
    setSelectedPropertyId(propId);
    if (propId && selectedRoomId) {
      const room = vacantRooms.find((r) => r.id === selectedRoomId);
      if (room && room.property_id !== propId) {
        setSelectedRoomId("");
        setMonthlyFee("");
      }
    }
  }

  // When room changes, update monthly fee
  function handleRoomChange(roomId: number | "") {
    setSelectedRoomId(roomId);
    if (roomId) {
      const room = vacantRooms.find((r) => r.id === roomId);
      if (room) {
        setMonthlyFee(room.price.toString());
        if (!selectedPropertyId) {
          setSelectedPropertyId(room.property_id);
        }
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!selectedRoomId || !startDate || !monthlyFee) {
      setError("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    try {
      // Step 1: Convert inquiry to tenant via server action
      const res = await fetch("/api/convert-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiry_id: inquiry.id,
          room_id: Number(selectedRoomId),
          move_in_date: startDate,
          initial_fee: Number(initialFee) || 0,
          monthly_fee: Number(monthlyFee),
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Conversion failed");
      }

      const { tenantId } = await res.json();

      // Step 2: Upload documents if provided
      if (idFile) {
        const formData = new FormData();
        formData.append("file", idFile);
        formData.append("tenant_id", tenantId.toString());
        formData.append("type", "id_photo");
        await fetch("/api/documents/upload", { method: "POST", body: formData });
      }

      if (payStubFile) {
        const formData = new FormData();
        formData.append("file", payStubFile);
        formData.append("tenant_id", tenantId.toString());
        formData.append("type", "pay_stub");
        await fetch("/api/documents/upload", { method: "POST", body: formData });
      }

      // Step 3: Trigger PDF download
      const pdfRes = await fetch(`/api/agreement/${tenantId}`);
      if (pdfRes.ok) {
        const blob = await pdfRes.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Membership-Agreement-${inquiry.name.replace(/\s+/g, "-")}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }

      setSuccess({ tenantId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mb-4 text-4xl">✅</div>
        <h2 className="mb-2 text-lg font-semibold text-green-800">Tenant Created & Agreement Generated</h2>
        <p className="mb-6 text-sm text-green-700">
          {inquiry.name} has been converted to an active tenant. The membership agreement PDF has been downloaded.
        </p>
        <div className="flex justify-center gap-3">
          <a
            href={`/admin/tenants/${success.tenantId}/edit`}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            View Tenant
          </a>
          <a
            href={`/api/agreement/${success.tenantId}`}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Download Agreement Again
          </a>
          <a
            href="/admin/inquiries"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Back to Inquiries
          </a>
        </div>
      </div>
    );
  }

  const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Pre-filled Member Info */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Member Information</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Full Name</label>
            <input type="text" value={inquiry.name} readOnly className={`${inputClass} bg-gray-50`} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="text" value={inquiry.email} readOnly className={`${inputClass} bg-gray-50`} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input type="text" value={inquiry.phone} readOnly className={`${inputClass} bg-gray-50`} />
          </div>
        </div>
      </div>

      {/* Agreement Details */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Agreement Details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>
              Property <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedPropertyId}
              onChange={(e) => handlePropertyChange(e.target.value ? Number(e.target.value) : "")}
              className={inputClass}
              required
            >
              <option value="">Select property...</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.address}, {p.city}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Room <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => handleRoomChange(e.target.value ? Number(e.target.value) : "")}
              className={inputClass}
              required
            >
              <option value="">Select room...</option>
              {filteredRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.room_number} — ${r.price}/mo
                  {!selectedPropertyId ? ` (${r.property_name})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>
              Monthly Membership Fee <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(e.target.value)}
                className={`${inputClass} pl-7`}
                required
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Initial Membership Fee</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={initialFee}
                onChange={(e) => setInitialFee(e.target.value)}
                className={`${inputClass} pl-7`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Document Uploads */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-1 text-sm font-semibold text-gray-900">Documents</h3>
        <p className="mb-4 text-xs text-gray-500">Optional — you can also upload these later from the tenant page.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Photo ID</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <div>
            <label className={labelClass}>Pay Stub</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setPayStubFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Converting..." : "Convert & Generate Agreement"}
        </button>
        <a
          href={`/admin/inquiries/${inquiry.id}`}
          className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
