import { ImageData } from "canvas";

export type BWImage = {
  size: [number, number];
  bit_data: Uint8Array;
};

export function imagedataToBwimage(imagedata: ImageData): BWImage {
  const inputWidth = imagedata.width;
  const inputHeight = imagedata.height;
  const width = Math.ceil(inputWidth / 8) * 8;
  const height = inputHeight;

  const bitData = new Uint8Array((width * height) / 8);
  const inputData = imagedata.data;
  for (let y = 0; y < height; y++) {
    const inputOffset = y * inputWidth;
    const offset = y * width;

    for (let x = 0; x < inputWidth; x += 8) {
      let result = 0;
      const numBits = Math.min(8, inputWidth - x);
      for (let bitIndex = 0; bitIndex < numBits; bitIndex++) {
        result |=
          (inputData[(inputOffset + x + bitIndex) * 4] === 0 ? 128 : 0) >>
          bitIndex;
      }
      bitData[(offset + x) >> 3] = result;
    }
  }

  return {
    bit_data: bitData,
    size: [width, height],
  };
}
