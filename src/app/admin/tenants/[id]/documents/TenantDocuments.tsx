"use client";

import { useState } from "react";
import type { TenantDocument } from "@/lib/types";
import { DOCUMENT_TYPES } from "@/lib/constants";

const docTypeLabels = Object.fromEntries(DOCUMENT_TYPES.map((d) => [d.value, d.label]));

interface TenantDocumentsProps {
  tenantId: number;
  initialDocuments: TenantDocument[];
  hasAgreement: boolean;
}

export default function TenantDocuments({ tenantId, initialDocuments, hasAgreement }: TenantDocumentsProps) {
  const [documents, setDocuments] = useState<TenantDocument[]>(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState("id_photo");

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.querySelector<HTMLInputElement>('input[type="file"]');
    const file = fileInput?.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("tenant_id", tenantId.toString());
    formData.append("type", uploadType);

    try {
      const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
      if (res.ok) {
        const { document } = await res.json();
        setDocuments((prev) => [document, ...prev]);
        form.reset();
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(docId: number) {
    if (!confirm("Delete this document?")) return;
    const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    if (res.ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Documents</h2>

      {/* Agreement Download */}
      {hasAgreement && (
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-blue-50 p-3">
          <span className="text-sm font-medium text-blue-800">Membership Agreement</span>
          <a
            href={`/api/agreement/${tenantId}`}
            className="ml-auto rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            Download PDF
          </a>
        </div>
      )}

      {/* Existing Documents */}
      {documents.length > 0 ? (
        <div className="mb-4 space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <div className="flex-1">
                <span className="text-xs font-medium text-gray-500">{docTypeLabels[doc.type] ?? doc.type}</span>
                <p className="text-sm font-medium text-gray-900">{doc.file_name}</p>
                <p className="text-xs text-gray-400">{new Date(doc.uploaded_at).toLocaleDateString()}</p>
              </div>
              <a
                href={`/api/documents/${doc.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300"
              >
                View
              </a>
              <button
                onClick={() => handleDelete(doc.id)}
                className="rounded bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-4 text-sm text-gray-500">No documents uploaded yet.</p>
      )}

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="flex items-end gap-3">
        <div className="flex-shrink-0">
          <label className="mb-1 block text-xs font-medium text-gray-600">Type</label>
          <select
            value={uploadType}
            onChange={(e) => setUploadType(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          >
            {DOCUMENT_TYPES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-600">File</label>
          <input
            type="file"
            accept="image/*,.pdf"
            required
            className="w-full text-sm text-gray-500 file:mr-2 file:rounded file:border-0 file:bg-blue-50 file:px-2 file:py-1.5 file:text-xs file:font-medium file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="flex-shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? "..." : "Upload"}
        </button>
      </form>
    </div>
  );
}
