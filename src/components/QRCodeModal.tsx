'use client';

import React, { useState, useEffect } from 'react';
import { generateQRCodeSVG } from '@/lib/qrcode';

interface QRCodeModalProps {
  isOpen: boolean;
  url: string;
  title?: string;
  onClose: () => void;
}

export default function QRCodeModal({ isOpen, url, title = 'Share Link QR Code', onClose }: QRCodeModalProps) {
  const [copied, setCopied] = useState(false);
  const [svgContent, setSvgContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !url) return;

    let isMounted = true;
    setLoading(true);

    generateQRCodeSVG(url, 220).then((svg) => {
      if (isMounted) {
        setSvgContent(svg);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, url]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-surface-container-lowest p-6 shadow-xl border border-outline-variant/30 flex flex-col items-center text-center">
        
        {/* Header */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-primary font-bold text-headline-sm">
            <span className="material-symbols-outlined text-primary text-[24px]">qr_code_2</span>
            <span>Mobile QR Scan</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <p className="text-body-sm text-on-surface-variant mb-5">
          Scan with your phone camera for instant cross-device access to {title}.
        </p>

        {/* QR Code Container */}
        <div className="p-4 bg-white rounded-2xl border border-outline-variant/30 shadow-inner mb-5 flex items-center justify-center min-h-[250px] min-w-[250px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 text-on-surface-variant">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-body-xs font-mono">Generating QR Code...</span>
            </div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: svgContent }} />
          )}
        </div>

        {/* Link box */}
        <div className="w-full p-2.5 bg-surface-container-low rounded-xl flex items-center justify-between text-body-xs font-mono text-on-surface truncate mb-4">
          <span className="truncate max-w-[200px] text-label-sm">{url}</span>
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 bg-primary text-on-primary font-sans text-label-xs font-semibold rounded-lg hover:bg-primary-container transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">{copied ? 'check' : 'content_copy'}</span>
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-surface-container text-on-surface font-semibold text-label-md rounded-xl hover:bg-surface-container-high transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
