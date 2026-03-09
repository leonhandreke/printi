export function fittingSize(
  [width, height]: [number, number],
  maxWidth: number
): { size: [number, number]; rotated: boolean } {
  const minor = Math.min(width, height);
  const major = Math.max(width, height);
  if (minor <= maxWidth) {
    return {
      size: width > maxWidth ? [height, width] : [width, height],
      rotated: width > maxWidth,
    };
  } else {
    const newMinor = maxWidth;
    const newMajor = Math.floor(major * (newMinor / minor));
    return {
      size: [newMinor, newMajor],
      rotated: width > height,
    };
  }
}
