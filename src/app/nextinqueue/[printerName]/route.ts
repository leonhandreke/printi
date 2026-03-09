import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { setupDatabase, queryOldestMessage } from "@/lib/db";
import {
  initNotificationManager,
  waitForNotification,
} from "@/lib/notificationManager";
import { ditherBytesToBwimage } from "@/lib/dither";
import { toPng, toH58 } from "@/lib/h58";
import { printerSize } from "@/lib/printerConfig";

export const runtime = "nodejs";

// Disable body parsing and response buffering for long-polling
export const dynamic = "force-dynamic";

// Increase the max duration for long-polling (in seconds).
// Vercel serverless has a 30s limit, but self-hosted has no limit.
// Set to a high value for self-hosted.
export const maxDuration = 300;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ printerName: string }> }
) {
  await setupDatabase();
  await initNotificationManager();

  const { printerName } = await params;
  const signal = req.signal;

  // Check if a message already exists in the database
  let message = await queryOldestMessage(printerName);

  if (!message) {
    // No message available, wait for a notification.
    // Loop: wait for notification -> check DB -> if still nothing, wait again.
    // This handles the case where another concurrent client grabbed the message.
    while (!message) {
      if (signal.aborted) {
        return new NextResponse("Client disconnected", { status: 499 });
      }

      try {
        // Wait for notification or abort
        await waitForNotification(printerName, signal);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return new NextResponse("Client disconnected", { status: 499 });
        }
        throw err;
      }

      // Notification received, try to grab the message
      message = await queryOldestMessage(printerName);
      // If null, another client got it via SKIP LOCKED. Loop again.
    }
  }

  if (!message || !message.image_data) {
    return new NextResponse("Nothing received!", { status: 404 });
  }

  // Dither the image
  const bwimage = await ditherBytesToBwimage(
    Buffer.from(message.image_data),
    printerSize(printerName)
  );

  // Determine output format from Accept header
  const accept = req.headers.get("accept") ?? "*/*";
  const outputPng =
    accept.includes("image/png") ||
    accept.includes("text/html") ||
    printerName === "printi";

  let content: Buffer | Uint8Array;
  let mediaType: string;
  let extension: string;

  if (outputPng) {
    content = toPng(bwimage);
    mediaType = "image/png";
    extension = "png";
  } else {
    content = toH58(bwimage);
    mediaType = "application/octet-stream";
    extension = "h58";
  }

  const filename = `printi-${uuidv4()}.${extension}`;

  // Convert to BodyInit type for NextResponse
  return new NextResponse(content as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": mediaType,
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
