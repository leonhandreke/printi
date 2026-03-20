export function sourceToDataUri(
  source: HTMLImageElement | HTMLVideoElement,
  width: number,
  height: number,
  pageWidth: number,
) {
  const canvas = document.createElement('canvas');
  const vert = height > width;
  const minorlength = vert ? width : height;

  let newWidth: number;
  let newHeight: number;

  if (minorlength <= pageWidth) {
    newWidth = width;
    newHeight = height;
  } else {
    const ratio = pageWidth / minorlength;
    newWidth = vert ? pageWidth : ratio * width;
    newHeight = vert ? ratio * height : pageWidth;
  }

  canvas.width = newWidth;
  canvas.height = newHeight;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(source, 0, 0, newWidth, newHeight);
  }

  const dataURL = minorlength <= pageWidth
    ? canvas.toDataURL('image/png')
    : canvas.toDataURL('image/jpeg', 0.7);

  return {
    dataURL,
    base64data: dataURL.split(',')[1],
  };
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function uploadToApi(printerName: string, body: BodyInit, headers?: Record<string, string>) {
  const url = new URL(`api/${printerName}`, window.location.origin + '/').toString();
  return fetch(url, { method: 'POST', headers, body });
}

export function savePrintiFriend(printerName: string) {
  const printiFriends = JSON.parse(localStorage.getItem('printiFriends') || '[]');
  if (!printiFriends.includes(printerName)) {
    printiFriends.push(printerName);
    localStorage.setItem('printiFriends', JSON.stringify(printiFriends));
  }
}
