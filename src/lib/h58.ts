import { createCanvas, ImageData } from "canvas";
import { BWImage } from "./bwimage";

export function toPng(raster: BWImage): Buffer {
  const rgbaData = new Uint8ClampedArray(raster.bit_data.length * 8 * 4);
  for (let i = 0; i < raster.bit_data.length; i++) {
    const byte = raster.bit_data[i];
    for (let j = 0; j < 8; j++) {
      const bitIndex = 7 - j;
      const isBlack = ((byte >> bitIndex) & 1) > 0;
      const offset = i * 8 * 4 + j * 4;
      if (isBlack) {
        rgbaData[offset] = 0;
        rgbaData[offset + 1] = 0;
        rgbaData[offset + 2] = 0;
        rgbaData[offset + 3] = 255;
      } else {
        rgbaData[offset] = 255;
        rgbaData[offset + 1] = 255;
        rgbaData[offset + 2] = 255;
        rgbaData[offset + 3] = 255;
      }
    }
  }

  const canvas = createCanvas(raster.size[0], raster.size[1]);
  const ctx = canvas.getContext("2d");
  const imageData = new ImageData(rgbaData, raster.size[0], raster.size[1]);
  ctx.putImageData(imageData, 0, 0);
  return canvas.toBuffer("image/png");
}

export function toH58(raster: BWImage): Uint8Array {
  const [width, height] = raster.size;
  const dotsPerLine = width;
  const bytesPerLine = Math.floor(dotsPerLine / 8);
  if (dotsPerLine !== bytesPerLine * 8) {
    throw new Error("raster width should be a multiple of 8");
  }

  const numSlices = Math.ceil(height / 24);
  const output = new Uint8Array(
    4 + bytesPerLine * height + numSlices * (4 + 4 + 3)
  );
  let outputOffset = 0;
  const addToOutput = (bytes: ArrayLike<number>) => {
    output.set(bytes, outputOffset);
    outputOffset += bytes.length;
  };

  addToOutput([0x1b, 0x40]); // Initialize printer
  for (let y = 0; y < height; y += 24) {
    const sliceHeight = Math.min(24, height - y);
    addToOutput([0x1d, 0x76, 0x30, 0x00]); // Print raster graphics command
    addToOutput([bytesPerLine & 255, bytesPerLine >> 8]);
    addToOutput([sliceHeight & 255, sliceHeight >> 8]);
    addToOutput(
      raster.bit_data.subarray(
        y * bytesPerLine,
        (y + sliceHeight) * bytesPerLine
      )
    );
    addToOutput([0x1b, 0x4a, 0x15]); // Line feed
  }
  addToOutput([0x1b, 0x40]); // Reset printer

  return output;
}
