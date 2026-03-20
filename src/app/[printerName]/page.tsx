'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import './printer.css';
import Header from './Header';
import InstallPrompt from './InstallPrompt';
import Receipt, { ReceiptState } from './Receipt';
import { loadImage, readFileAsDataURL, savePrintiFriend, sourceToDataUri, uploadToApi } from './upload';

let nextReceiptId = 0;

export default function PrinterPage() {
  const params = useParams();
  const printerName = (params.printerName as string) || 'printi';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [receipts, setReceipts] = useState<ReceiptState[]>([]);
  const [firstPrintiSent, setFirstPrintiSent] = useState(false);

  const pageWidth = printerName === 'printi' ? 576 : 384;

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

  const updateReceipt = (id: string, updates: Partial<ReceiptState>) => {
    setReceipts(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeReceipt = (id: string) => {
    setReceipts(prev => prev.filter(r => r.id !== id));
  };

  const sendAndAnimate = async (id: string, body: BodyInit, headers?: Record<string, string>) => {
    updateReceipt(id, { wiggling: true, curtainWidth: 0 });
    await uploadToApi(printerName, body, headers);
    updateReceipt(id, { bwFilter: true });

    setTimeout(() => {
      updateReceipt(id, { wiggling: false, printed: true });
      setTimeout(() => {
        removeReceipt(id);
        setFirstPrintiSent(true);
      }, 2000);
    }, 1000);
  };

  const uploadImage = useCallback(async (fileSource: File | null, videoSource: HTMLVideoElement | null) => {
    savePrintiFriend(printerName);

    const id = String(nextReceiptId++);
    setReceipts(prev => [...prev, {
      id,
      previewSrc: null,
      filename: null,
      curtainWidth: 100,
      wiggling: false,
      bwFilter: false,
      printed: false,
    }]);

    const jsonHeaders = { 'Content-Type': 'application/json; charset=UTF-8' };

    if (videoSource !== null) {
      const result = sourceToDataUri(videoSource, videoSource.videoWidth, videoSource.videoHeight, pageWidth);
      updateReceipt(id, { previewSrc: result.dataURL });
      await sendAndAnimate(id, JSON.stringify({ images: [result.base64data] }), jsonHeaders);
    } else if (fileSource && fileSource.type.match('image.*')) {
      const dataUrl = await readFileAsDataURL(fileSource);
      updateReceipt(id, { previewSrc: dataUrl });

      const img = await loadImage(dataUrl);
      const result = sourceToDataUri(img, img.width, img.height, pageWidth);
      await sendAndAnimate(id, JSON.stringify({ images: [result.base64data] }), jsonHeaders);
    } else if (fileSource) {
      updateReceipt(id, { filename: fileSource.name });
      const data = new FormData();
      data.append('file0', fileSource);
      await sendAndAnimate(id, data);
    }
  }, [printerName, pageWidth]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      for (let i = 0; i < e.target.files.length; i++) {
        uploadImage(e.target.files[i], null);
      }
      e.target.value = '';
    }
  };

  const handleCapture = (video: HTMLVideoElement) => {
    uploadImage(null, video);
  };

  // Paste and drop handlers
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData) {
        const pastedFiles: File[] = [];
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          if (e.clipboardData.items[i].type.indexOf('image') >= 0) {
            const blob = e.clipboardData.items[i].getAsFile();
            if (blob) pastedFiles.push(blob);
          }
        }
        pastedFiles.forEach(f => uploadImage(f, null));
        if (pastedFiles.length > 0) e.preventDefault();
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.items) {
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          if (e.dataTransfer.items[i].kind === 'file') {
            const file = e.dataTransfer.items[i].getAsFile();
            if (file) uploadImage(file, null);
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
    </>
  );
}
