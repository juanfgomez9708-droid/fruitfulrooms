import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { deleteTenantDocument } from "@/lib/actions";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  // Get document record
  const { data: doc, error } = await supabaseAdmin
    .from("tenant_documents")
    .select("storage_path, file_name")
    .eq("id", Number(id))
    .single();

  if (error || !doc) {
    return new Response("Document not found", { status: 404 });
  }

  // Download from Supabase Storage
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from("tenant-documents")
    .download(doc.storage_path);

  if (downloadError || !fileData) {
    return new Response("File not found in storage", { status: 404 });
  }

  const arrayBuffer = await fileData.arrayBuffer();
  const ext = doc.file_name.split(".").pop()?.toLowerCase() ?? "";
  const contentType =
    ext === "pdf" ? "application/pdf" :
    ext === "png" ? "image/png" :
    ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
    "application/octet-stream";

  return new Response(arrayBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${doc.file_name}"`,
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  try {
    await deleteTenantDocument(Number(id));
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Failed to delete" }, { status: 500 });
  }
}
