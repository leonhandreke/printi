declare module "canvas-dither" {
  interface CanvasDither {
    floydsteinberg(imageData: ImageData): ImageData;
    atkinson(imageData: ImageData): ImageData;
    threshold(imageData: ImageData, threshold?: number): ImageData;
    bayer(imageData: ImageData, threshold?: number): ImageData;
  }
  const canvasDither: CanvasDither;
  export default canvasDither;
}
