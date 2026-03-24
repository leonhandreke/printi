import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ printerName: string }> }
) {
  const { printerName: rawPrinterName } = await params;
  const printerName = rawPrinterName.toLowerCase();

  const manifest = {
    name: `printi ${printerName}`,
    short_name: printerName,
    description: "The world's fastest photo printer!",
    start_url: `/${printerName}`,
    display: 'standalone',
    icons: [
      {
        src: '/banner.svg',
        purpose: 'maskable any',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
    screenshots: [
      {
        src: '/banner.svg',
        type: 'image/svg+xml',
        sizes: '1200x1200',
      },
    ],
    share_target: {
      action: `/api/${printerName}`,
      method: 'POST',
      enctype: 'multipart/form-data',
      params: {
        files: [
          {
            name: 'file',
            accept: ['image/*'],
          },
        ],
      },
    },
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
    },
  });
}
