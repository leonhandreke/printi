'use client';

import { useRef, useState } from 'react';

interface HeaderProps {
  printerName: string;
  onCapture: (video: HTMLVideoElement) => void;
}

export default function Header({ printerName, onCapture }: HeaderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraConnected, setCameraConnected] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showPrintiCamButton, setShowPrintiCamButton] = useState(false);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks()[0].stop();
    }
    setCameraConnected(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleLogoClick = () => {
    if (cameraConnected) {
      if (showCamera) {
        setTimeout(stopCamera, 500);
      }
      setShowCamera(!showCamera);
    } else {
      setShowPrintiCamButton(!showPrintiCamButton);
    }
  };

  const handlePrintiCamClick = () => {
    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: { facingMode: 'environment' },
      })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraConnected(true);
        setShowPrintiCamButton(false);
        setShowCamera(true);
      })
      .catch((error) => {
        console.error(error);
        setCameraConnected(false);
      });
  };

  const handleCameraClick = () => {
    if (videoRef.current) {
      onCapture(videoRef.current);
    }
  };

  return (
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
  );
}
