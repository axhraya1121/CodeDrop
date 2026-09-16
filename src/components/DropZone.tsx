'use client';

import { useState, useRef } from 'react';

interface DropZoneProps {
  onUpload: (files: FileList) => void;
  uploading: boolean;
  uploadProgress: { fileName: string; percent: number } | null;
}

export default function DropZone({ onUpload, uploading, uploadProgress }: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragActive) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative w-full rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer shadow-sm hover:shadow-md ${
          isDragActive 
            ? 'border-solid border-2 border-primary bg-primary/5 dark:bg-primary/10' 
            : 'border-2 border-dashed border-outline-variant/40 dark:border-slate-700 bg-surface-container-lowest dark:bg-slate-900/60'
        }`}
      >
        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className={`flex flex-col items-center justify-center transition-opacity ${uploading ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <div className="w-16 h-16 mb-4 rounded-2xl bg-surface-container-low dark:bg-slate-800 flex items-center justify-center text-primary dark:text-primary-fixed-dim shadow-sm">
            <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
          </div>
          <h3 className="text-headline-sm font-semibold text-on-surface dark:text-slate-100 mb-2">Drag files here or click to browse</h3>
          <p className="text-body-md text-on-surface-variant dark:text-slate-400 mb-6">Payloads are uploaded to your private cloud vault.</p>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-container dark:bg-slate-800 rounded-full border border-outline-variant/30 dark:border-slate-700">
              <span className="material-symbols-outlined text-[14px] text-tertiary dark:text-emerald-400">verified_user</span>
              <span className="text-label-sm text-on-surface-variant dark:text-slate-300 font-mono">End-to-end encrypted</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-container dark:bg-slate-800 rounded-full border border-outline-variant/30 dark:border-slate-700">
              <span className="material-symbols-outlined text-[14px] text-tertiary dark:text-emerald-400">lock</span>
              <span className="text-label-sm text-on-surface-variant dark:text-slate-300 font-mono">Private to you</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Progress Card matching Stitch Theme */}
      {uploadProgress && (
        <div className="p-5 rounded-2xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 dark:border-slate-800 shadow-sm animate-fade-in flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-primary-fixed-dim shrink-0">
                <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
              </div>
              <div className="min-w-0">
                <p className="text-body-md font-semibold text-on-surface dark:text-slate-100 truncate">{uploadProgress.fileName}</p>
                <p className="text-label-sm text-on-surface-variant dark:text-slate-400 font-mono">Uploading payload to private storage...</p>
              </div>
            </div>
            <span className="text-label-md text-primary dark:text-primary-fixed-dim font-bold font-mono shrink-0">{uploadProgress.percent}%</span>
          </div>
          
          <div className="w-full h-2 rounded-full bg-surface-container dark:bg-slate-800 overflow-hidden">
            <div 
              className="h-full rounded-full bg-primary dark:bg-primary-fixed-dim transition-all duration-200 ease-out" 
              style={{ width: `${uploadProgress.percent}%` }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
