import { NextRequest, NextResponse } from "next/server";
import { setupDatabase, insertMessage } from "@/lib/db";

export const runtime = "nodejs";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ printerName: string }> }
) {
  await setupDatabase();
  const { printerName } = await params;

  const contentType = req.headers.get("content-type") ?? "";
  let numAdded = 0;

  try {
    if (contentType.includes("application/json")) {
      // Handle JSON payload with base64 images
      const body = await req.json();
      const images: string[] = body.images ?? [];

      for (const imgStr of images) {
        if (imgStr.length < MAX_SIZE) {
          const imageBytes = Buffer.from(imgStr, "base64");
          await insertMessage(printerName, imageBytes);
          numAdded++;
        }
      }
    } else if (contentType.includes("multipart/form-data")) {
      // Handle form-data with file uploads
      const formData = await req.formData();

      for (const [, value] of formData.entries()) {
        if (value instanceof File) {
          const arrayBuffer = await value.arrayBuffer();
          const imageBytes = Buffer.from(arrayBuffer);

          if (imageBytes.length < MAX_SIZE) {
            await insertMessage(printerName, imageBytes);
            numAdded++;
          }
        }
      }
    } else {
      console.warn(`[upload] Unknown content type: ${contentType}`);
    }
  } catch (err) {
    console.error(`[upload] Error processing upload:`, err);
  }

  // Return HTML response like the original
  return new NextResponse(
    "<html><body><h1>Printi is printing!</h1><script>setTimeout(() => { window.close() }, 2000)</script></body></html>",
    {
      status: 200,
      headers: {
        "Content-Type": "text/html",
      },
    }
  );
}
