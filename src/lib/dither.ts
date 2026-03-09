import { createCanvas, loadImage, ImageData } from "canvas";
import canvasDither from "canvas-dither";
import { fittingSize } from "./resize";
import { imagedataToBwimage, BWImage } from "./bwimage";

export async function ditherBytesToBwimage(
  imgContents: Buffer,
  maxWidth: number
): Promise<BWImage> {
  const img = await loadImage(imgContents);
  const inputW = img.width;
  const inputH = img.height;

  const { size, rotated } = fittingSize([inputW, inputH], maxWidth);

  const canvas = createCanvas(size[0], size[1]);
  const ctx = canvas.getContext("2d");

  if (rotated) {
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(img, 0, -size[0], size[1], size[0]);
    ctx.rotate(-Math.PI / 2);
  } else {
    ctx.drawImage(img, 0, 0, size[0], size[1]);
  }

  const imgData = ctx.getImageData(0, 0, size[0], size[1]);

  // Gamma correction: f(x) = 255 * sqrt(x / 255)
  for (let i = 0, n = imgData.data.length; i < n; i += 4) {
    imgData.data[i] = 255 * Math.sqrt(imgData.data[i] / 255);
    imgData.data[i + 1] = 255 * Math.sqrt(imgData.data[i + 1] / 255);
    imgData.data[i + 2] = 255 * Math.sqrt(imgData.data[i + 2] / 255);
    // imgData.data[i + 3] is alpha, leave unchanged
  }

  // @ts-expect-error - canvas-dither types don't match canvas package exactly
  const outputImgData = canvasDither.floydsteinberg(imgData);
  return imagedataToBwimage(outputImgData);
}
