import { NextRequest, NextResponse } from "next/server";
import { setupDatabase, insertMessage, upsertPrintiSeen } from "@/lib/db";

export const runtime = "nodejs";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ printerName: string }> }
) {
  await setupDatabase();
  const { printerName: rawPrinterName } = await params;
  const printerName = rawPrinterName.toLowerCase();
  const rawDescription = req.headers.get("X-Printi-Description");
  const description = rawDescription
    ? Buffer.from(rawDescription, "latin1").toString("utf8")
    : null;

  const contentType = req.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const images: string[] = body.images ?? [];

      for (const imgStr of images) {
        if (imgStr.length < MAX_SIZE) {
          const imageBytes = Buffer.from(imgStr, "base64");
          await insertMessage(printerName, imageBytes);
        }
      }
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();

      for (const [, value] of formData.entries()) {
        if (value instanceof File) {
          const arrayBuffer = await value.arrayBuffer();
          const imageBytes = Buffer.from(arrayBuffer);

          if (imageBytes.length < MAX_SIZE) {
            await insertMessage(printerName, imageBytes);
          }
        }
      }
    } else {
      console.warn(`[upload] Unknown content type: ${contentType}`);
    }
    // Only mark the printi as seen once the upload has been successfully
    // processed and the request identifies itself with a description header,
    // so malformed POSTs from scanners don't pollute the address book with
    // names like "_next", "route", etc.
    if (description !== null) {
      await upsertPrintiSeen(printerName, description);
    }
  } catch (err) {
    console.error(`[upload] Error processing upload:`, err);
  }

  return new NextResponse(
    "<html><body><h1>Printi is printing!</h1><script>setTimeout(() => { window.close() }, 2000)</script></body></html>",
    {
      status: 200,
      headers: { "Content-Type": "text/html" },
    }
  );
}
