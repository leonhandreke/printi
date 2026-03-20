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

export const dynamic = "force-dynamic";

export const maxDuration = 300;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ printerName: string }> }
) {
  await setupDatabase();
  await initNotificationManager();

  const { printerName } = await params;
  const signal = req.signal;

  let message = await queryOldestMessage(printerName);

  if (!message) {
    while (!message) {
      if (signal.aborted) {
        return new NextResponse("Client disconnected", { status: 499 });
      }

      try {
        await waitForNotification(printerName, signal);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return new NextResponse("Client disconnected", { status: 499 });
        }
        throw err;
      }

      message = await queryOldestMessage(printerName);
    }
  }

  if (!message || !message.image_data) {
    return new NextResponse("Nothing received!", { status: 404 });
  }

  const bwimage = await ditherBytesToBwimage(
    Buffer.from(message.image_data),
    printerSize(printerName)
  );

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

  return new NextResponse(content as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": mediaType,
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
