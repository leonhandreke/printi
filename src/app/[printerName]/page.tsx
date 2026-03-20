'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import './printer.css';

export default function PrinterPage() {
  const params = useParams();
  const printerName = (params.printerName as string) || 'printi';

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const receiptStackRef = useRef<HTMLDivElement>(null);
  const receiptPrototypeRef = useRef<HTMLDivElement>(null);

  const [cameraConnected, setCameraConnected] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showPrintiCamButton, setShowPrintiCamButton] = useState(false);
  const [firstPrintiSent, setFirstPrintiSent] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const deferredPromptRef = useRef<any>(null);

  const PAGEWIDTH = printerName === 'printi' ? 576 : 384;

  // Set manifest link dynamically
  useEffect(() => {
    // Update manifest link
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

  // Upload image function
  const uploadImage = (fileSource: File | null, videoSource: HTMLVideoElement | null) => {
    const api_server = window.location.origin + '/';

    // Add printi name to localStorage
    const printiFriends = JSON.parse(localStorage.getItem('printiFriends') || '[]');
    if (!printiFriends.includes(printerName)) {
      printiFriends.push(printerName);
      localStorage.setItem('printiFriends', JSON.stringify(printiFriends));
    }

    // Clone receipt element
    if (!receiptPrototypeRef.current || !receiptStackRef.current) return;
    const receiptEl = receiptPrototypeRef.current.cloneNode(true) as HTMLDivElement;
    receiptStackRef.current.insertBefore(receiptEl, receiptPrototypeRef.current);

    const xhr = new XMLHttpRequest();

    // Progress handler
    xhr.upload.onprogress = (e) => {
      const reverseprogress = ((e.total - e.loaded) / e.total) * 100;
      const curtain = receiptEl.querySelector('#curtain') as HTMLDivElement;
      if (curtain) {
        curtain.style.width = reverseprogress + '%';
      }
      if (reverseprogress < 5 && !receiptEl.classList.contains('wiggler')) {
        receiptEl.classList.add('wiggler');
      }
    };

    // Load handler
    xhr.onload = () => {
      const curtain = receiptEl.querySelector('#curtain') as HTMLDivElement;
      if (curtain) {
        curtain.style.width = '0%';
      }
      const previewImg = receiptEl.querySelector('.previewimg') as HTMLImageElement;
      if (previewImg) {
        previewImg.classList.add('bwfilter');
      }

      setTimeout(() => {
        receiptEl.classList.remove('wiggler');
        const padder = receiptEl.querySelector('.receiptpadder') as HTMLDivElement;
        if (padder) {
          padder.classList.add('printed');
        }
        setTimeout(() => {
          if (receiptStackRef.current) {
            receiptStackRef.current.removeChild(receiptEl);
          }
          setFirstPrintiSent(true);
        }, 2000);
      }, 1000);
    };

    xhr.open('POST', new URL(`submitimages/${printerName}`, api_server).toString(), true);

    const ua = window.navigator.userAgent;
    const ie = (ua.indexOf('MSIE ') + ua.indexOf('Trident/') + ua.indexOf('Edge/') > -3);
    const isNotAnImageFile = videoSource === null && fileSource && !fileSource.type.match('image.*');
    const filereadersupport = 'FileReader' in window;

    if (!ie && !isNotAnImageFile && filereadersupport) {
      xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');

      if (videoSource !== null) {
        const result = sourceToDataUri(videoSource, videoSource.videoWidth, videoSource.videoHeight);
        const previewImg = receiptEl.querySelector('.previewimg') as HTMLImageElement;
        if (previewImg) {
          previewImg.src = result.dataURL;
        }
        xhr.send(JSON.stringify({ images: [result.base64data] }));
      } else if (fileSource) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const previewImg = receiptEl.querySelector('.previewimg') as HTMLImageElement;
          if (previewImg && e.target) {
            previewImg.src = e.target.result as string;
          }

          const immie = document.createElement('img');
          immie.onload = () => {
            const result = sourceToDataUri(immie, immie.width, immie.height);
            xhr.send(JSON.stringify({ images: [result.base64data] }));
          };
          immie.src = e.target?.result as string;
        };
        reader.readAsDataURL(fileSource);
      }
    } else if (fileSource) {
      const previewEl = receiptEl.querySelector('.preview') as HTMLDivElement;
      const filenameP = document.createElement('p');
      filenameP.innerText = fileSource.name;
      const previewImg = previewEl.querySelector('img');
      if (previewImg) {
        previewImg.parentNode?.removeChild(previewImg);
      }
      previewEl.appendChild(filenameP);

      const data = new FormData();
      data.append('file0', fileSource);
      xhr.send(data);
    }
  };

  // File picker change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      for (let i = 0; i < e.target.files.length; i++) {
        uploadImage(e.target.files[i], null);
      }
      // Reset the input
      e.target.value = '';
    }
  };

  // Logo click handler
  const handleLogoClick = () => {
    if (cameraConnected) {
      if (showCamera) {
        setTimeout(() => {
          if (streamRef.current) {
            streamRef.current.getTracks()[0].stop();
          }
          setCameraConnected(false);
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
        }, 500);
      }
      setShowCamera(!showCamera);
    } else {
      setShowPrintiCamButton(!showPrintiCamButton);
    }
  };

  // Printi cam button click handler
  const handlePrintiCamClick = () => {
    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: 'environment',
      },
    }).then((stream) => {
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraConnected(true);
      setShowPrintiCamButton(false);
      setShowCamera(true);
    }).catch((error) => {
      console.error(error);
      setCameraConnected(false);
    });
  };

  // Camera container click (take picture)
  const handleCameraClick = () => {
    if (videoRef.current) {
      uploadImage(null, videoRef.current);
    }
  };

  // Setup effects
  useEffect(() => {
    // Paste handler
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

    // Drop handler
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

    // Drag handlers
    const handleDragOver = (e: DragEvent) => e.preventDefault();

    // Visibility change handler
    const handleVisibilityChange = () => {
      if (cameraConnected && document.visibilityState !== 'visible') {
        if (streamRef.current) {
          streamRef.current.getTracks()[0].stop();
        }
        setCameraConnected(false);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        setShowPrintiCamButton(true);
        setShowCamera(false);
      }
    };

    // PWA install prompt handler
    const handleBeforeInstallPrompt = (e: Event) => {
      if (!/android/i.test(navigator.userAgent)) return;
      e.preventDefault();
      deferredPromptRef.current = e;
      setShowInstallPrompt(true);
    };

    document.addEventListener('paste', handlePaste);
    document.body.addEventListener('drop', handleDrop);
    document.body.addEventListener('dragenter', handleDragOver);
    document.body.addEventListener('dragover', handleDragOver);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      document.removeEventListener('paste', handlePaste);
      document.body.removeEventListener('drop', handleDrop);
      document.body.removeEventListener('dragenter', handleDragOver);
      document.body.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [cameraConnected]);

  const handleInstallClick = () => {
    if (deferredPromptRef.current) {
      deferredPromptRef.current.prompt();
      deferredPromptRef.current = null;
    }
    setShowInstallPrompt(false);
  };

  return (
    <>
      <header>
        <div id="logocontainer" onClick={handleLogoClick}>
          <h1>
            <img src="/printi_logo_transparent.svg" width="100" height="34" alt="printi" title="printi" />
            <span id="printernametitle">/{printerName}</span>
          </h1>
        </div>
        <div
          id="cameracontainer"
          className={`titlesecret ${showCamera ? 'showcamera' : ''}`}
          onClick={handleCameraClick}
        >
          <div id="videoscreen">
            <video ref={videoRef} playsInline autoPlay muted></video>
          </div>
        </div>
        <div
          id="printicambuttoncontainer"
          className={`titlesecret ${showPrintiCamButton ? 'showprinticambutton' : ''}`}
          onClick={handlePrintiCamClick}
        >
          <div className="printicamrotator" style={{ width: '8.4ex', transform: 'rotate(-15deg) translate(-17px, 12px)' }}>
            <div className="printicamtext" style={{ animationDuration: '3000ms' }}>printiprintiprintiprinti</div>
          </div>
          <div className="printicamrotator" style={{ width: '4.2ex', transform: 'rotate(-15deg) translate(23px, 7px)' }}>
            <div className="printicamtext">camcamcamcam</div>
          </div>
        </div>
      </header>

      <main id="receiptstack" ref={receiptStackRef}>
        <span style={{ display: 'none' }} ref={receiptPrototypeRef}>
          <div className="receiptcontainer">
            <div className="receiptpadder">
              <div className="receiptbackground">
                <div className="preview">
                  <img className="previewimg" src="#" width="250" alt="" />
                  <div id="curtain"></div>
                </div>
              </div>
            </div>
          </div>
        </span>

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

      {showInstallPrompt && firstPrintiSent && (
        <div id="pwa-installable">
          <div id="first-printi-sent">
            <div id="install-box">
              <p>
                Do you want to install <span style={{ fontStyle: 'italic' }}>{printerName}</span> to your phone to easily send photos to your printi friends from other apps?
              </p>
              <button onClick={handleInstallClick}>Yes!</button>
            </div>
          </div>
        </div>
      )}

      <script src="https://webrtc.github.io/adapter/adapter-latest.js" async></script>
    </>
  );
}
