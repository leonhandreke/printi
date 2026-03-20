'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import './printer.css';
import Header from './Header';
import InstallPrompt from './InstallPrompt';
import Receipt, { ReceiptState } from './Receipt';

let nextReceiptId = 0;

export default function PrinterPage() {
  const params = useParams();
  const printerName = (params.printerName as string) || 'printi';

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [receipts, setReceipts] = useState<ReceiptState[]>([]);
  const [firstPrintiSent, setFirstPrintiSent] = useState(false);

  const PAGEWIDTH = printerName === 'printi' ? 576 : 384;

  // Set manifest link dynamically
  useEffect(() => {
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = `/${printerName}/manifest.json`;
  }, [printerName]);

  // Source to DataURI conversion
  const sourceToDataUri = (source: HTMLImageElement | HTMLVideoElement, width: number, height: number) => {
    const canvas = document.createElement('canvas');
    const vert = height > width;
    const minorlength = vert ? width : height;

    let newWidth = 0;
    let newHeight = 0;

    if (minorlength <= PAGEWIDTH) {
      newWidth = width;
      newHeight = height;
    } else {
      const ratio = PAGEWIDTH / minorlength;
      newWidth = vert ? PAGEWIDTH : ratio * width;
      newHeight = vert ? ratio * height : PAGEWIDTH;
    }

    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(source, 0, 0, newWidth, newHeight);
    }

    let datayumyum;
    if (minorlength <= PAGEWIDTH) {
      datayumyum = canvas.toDataURL('image/png');
    } else {
      datayumyum = canvas.toDataURL('image/jpeg', 0.7);
    }

    const base64data = datayumyum.split(',')[1];
    return {
      dataURL: datayumyum,
      base64data: base64data,
    };
  };

  const updateReceipt = (id: string, updates: Partial<ReceiptState>) => {
    setReceipts(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeReceipt = (id: string) => {
    setReceipts(prev => prev.filter(r => r.id !== id));
  };

  // Upload image function
  const uploadImage = useCallback((fileSource: File | null, videoSource: HTMLVideoElement | null) => {
    const api_server = window.location.origin + '/';

    // Add printi name to localStorage
    const printiFriends = JSON.parse(localStorage.getItem('printiFriends') || '[]');
    if (!printiFriends.includes(printerName)) {
      printiFriends.push(printerName);
      localStorage.setItem('printiFriends', JSON.stringify(printiFriends));
    }

    // Create receipt in state
    const id = String(nextReceiptId++);
    const newReceipt: ReceiptState = {
      id,
      previewSrc: null,
      filename: null,
      curtainWidth: 100,
      wiggling: false,
      bwFilter: false,
      printed: false,
    };
    setReceipts(prev => [...prev, newReceipt]);

    const xhr = new XMLHttpRequest();

    // Progress handler
    xhr.upload.onprogress = (e) => {
      const reverseprogress = ((e.total - e.loaded) / e.total) * 100;
      updateReceipt(id, {
        curtainWidth: reverseprogress,
        wiggling: reverseprogress < 5 ? true : undefined,
      });
      if (reverseprogress < 5) {
        updateReceipt(id, { wiggling: true });
      }
    };

    // Load handler
    xhr.onload = () => {
      updateReceipt(id, { curtainWidth: 0, bwFilter: true });

      setTimeout(() => {
        updateReceipt(id, { wiggling: false, printed: true });
        setTimeout(() => {
          removeReceipt(id);
          setFirstPrintiSent(true);
        }, 2000);
      }, 1000);
    };

    xhr.open('POST', new URL(`api/${printerName}`, api_server).toString(), true);

    const ua = window.navigator.userAgent;
    const ie = (ua.indexOf('MSIE ') + ua.indexOf('Trident/') + ua.indexOf('Edge/') > -3);
    const isNotAnImageFile = videoSource === null && fileSource && !fileSource.type.match('image.*');
    const filereadersupport = 'FileReader' in window;

    if (!ie && !isNotAnImageFile && filereadersupport) {
      xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');

      if (videoSource !== null) {
        const result = sourceToDataUri(videoSource, videoSource.videoWidth, videoSource.videoHeight);
        updateReceipt(id, { previewSrc: result.dataURL });
        xhr.send(JSON.stringify({ images: [result.base64data] }));
      } else if (fileSource) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          updateReceipt(id, { previewSrc: dataUrl });

          const immie = document.createElement('img');
          immie.onload = () => {
            const result = sourceToDataUri(immie, immie.width, immie.height);
            xhr.send(JSON.stringify({ images: [result.base64data] }));
          };
          immie.src = dataUrl;
        };
        reader.readAsDataURL(fileSource);
      }
    } else if (fileSource) {
      updateReceipt(id, { filename: fileSource.name });

      const data = new FormData();
      data.append('file0', fileSource);
      xhr.send(data);
    }
  }, [printerName, PAGEWIDTH]);

  // File picker change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      for (let i = 0; i < e.target.files.length; i++) {
        uploadImage(e.target.files[i], null);
      }
      e.target.value = '';
    }
  };

  // Handle camera capture from Header
  const handleCapture = (video: HTMLVideoElement) => {
    uploadImage(null, video);
  };

  // Paste and drop handlers
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData) {
        const items = e.clipboardData.items;
        const pastedFiles: File[] = [];
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') >= 0) {
            const blob = items[i].getAsFile();
            if (blob) {
              pastedFiles.push(blob);
            }
          }
        }
        for (let i = 0; i < pastedFiles.length; i++) {
          uploadImage(pastedFiles[i], null);
        }
        if (pastedFiles.length > 0) {
          e.preventDefault();
        }
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.items) {
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          if (e.dataTransfer.items[i].kind === 'file') {
            const file = e.dataTransfer.items[i].getAsFile();
            if (file) {
              uploadImage(file, null);
            }
          }
        }
      } else if (e.dataTransfer?.files) {
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          uploadImage(e.dataTransfer.files[i], null);
        }
      }
    };

    const handleDragOver = (e: DragEvent) => e.preventDefault();

    document.addEventListener('paste', handlePaste);
    document.body.addEventListener('drop', handleDrop);
    document.body.addEventListener('dragenter', handleDragOver);
    document.body.addEventListener('dragover', handleDragOver);

    return () => {
      document.removeEventListener('paste', handlePaste);
      document.body.removeEventListener('drop', handleDrop);
      document.body.removeEventListener('dragenter', handleDragOver);
      document.body.removeEventListener('dragover', handleDragOver);
    };
  }, [uploadImage]);

  return (
    <>
      <Header printerName={printerName} onCapture={handleCapture} />

      <main id="receiptstack">
        {receipts.map(receipt => (
          <Receipt key={receipt.id} receipt={receipt} />
        ))}

        <div className="receiptcontainer fadein" id="receiptupload">
          <div className="receiptpadder">
            <div className="receiptbackground">
              <div id="formcontainer">
                <form id="leform" action="" method="post" encType="multipart/form-data">
                  <input
                    ref={fileInputRef}
                    id="filepicker"
                    type="file"
                    name="theshiz"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer>
        <a href="https://github.com/fons-/printi/blob/master/README.md" rel="help">What is printi?</a>
      </footer>

      <InstallPrompt printerName={printerName} firstPrintiSent={firstPrintiSent} />

      <script src="https://webrtc.github.io/adapter/adapter-latest.js" async></script>
    </>
  );
}
