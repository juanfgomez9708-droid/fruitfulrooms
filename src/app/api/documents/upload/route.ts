import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { createTenantDocument } from "@/lib/actions";

export async function POST(req: Request) {
  try {
    await requireAuth();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const tenantId = formData.get("tenant_id") as string;
  const docType = formData.get("type") as string;

  if (!file || !tenantId || !docType) {
    return Response.json({ error: "Missing file, tenant_id, or type" }, { status: 400 });
  }

  if (!["id_photo", "pay_stub", "other"].includes(docType)) {
    return Response.json({ error: "Invalid document type" }, { status: 400 });
  }

  // 10MB limit
  if (file.size > 10 * 1024 * 1024) {
    return Response.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const storagePath = `${tenantId}/${docType}/${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabaseAdmin.storage
    .from("tenant-documents")
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return Response.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const doc = await createTenantDocument({
    tenant_id: Number(tenantId),
    type: docType,
    file_name: file.name,
    storage_path: storagePath,
  });

  return Response.json({ success: true, document: doc });
}
