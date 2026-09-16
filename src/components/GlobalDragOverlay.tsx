'use client';

import { useState, useEffect } from 'react';

interface GlobalDragOverlayProps {
  onDropFiles: (files: FileList) => void;
}

export default function GlobalDragOverlay({ onDropFiles }: GlobalDragOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer?.types && e.dataTransfer.types.includes('Files')) {
        dragCounter++;
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter <= 0) {
        setIsDragging(false);
        dragCounter = 0;
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter = 0;

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        onDropFiles(e.dataTransfer.files);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [onDropFiles]);

  if (!isDragging) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary/20 dark:bg-primary/30 backdrop-blur-xl border-4 border-dashed border-primary animate-fade-in pointer-events-none">
      <div className="p-8 rounded-3xl bg-surface-container-lowest dark:bg-slate-900 border border-primary/30 shadow-2xl flex flex-col items-center text-center gap-4 max-w-sm">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-primary-fixed-dim animate-bounce">
          <span className="material-symbols-outlined text-[48px]">cloud_upload</span>
        </div>
        <h2 className="text-headline-md font-bold text-on-surface dark:text-slate-100">Drop Files Anywhere</h2>
        <p className="text-body-md text-on-surface-variant dark:text-slate-300">
          Release your files to instantly upload them to your private vault.
        </p>
      </div>
    </div>
  );
}
