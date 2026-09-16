'use client';

import { useState, useEffect } from 'react';

interface FilePreviewModalProps {
  file: {
    id: string;
    fileName: string;
    size: number;
    uploadedAt: string;
  } | null;
  onClose: () => void;
  onDownload: (id: string) => void;
  isPublic?: boolean;
}

export default function FilePreviewModal({ file, onClose, onDownload, isPublic = false }: FilePreviewModalProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [textError, setTextError] = useState(false);

  const getFileCategory = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
    if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) return 'video';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['json', 'js', 'ts', 'py', 'c', 'cpp', 'java', 'html', 'css', 'txt', 'md', 'sh', 'sql', 'yml', 'xml'].includes(ext)) return 'text';
    return 'unsupported';
  };

  const fileUrl = isPublic 
    ? `/api/public/files/${file?.id}/download?inline=true` 
    : `/api/files/${file?.id}/download?inline=true`;

  useEffect(() => {
    if (!file) return;

    const category = getFileCategory(file.fileName);

    if (category === 'text') {
      setLoadingText(true);
      setTextError(false);
      setTextContent(null);

      fetch(fileUrl)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch text content');
          return res.text();
        })
        .then((text) => setTextContent(text))
        .catch(() => setTextError(true))
        .finally(() => setLoadingText(false));
    }
  }, [file, fileUrl]);

  if (!file) return null;

  const category = getFileCategory(file.fileName);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl max-h-[85vh] bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 dark:border-slate-800 bg-surface-container-low dark:bg-slate-800/60">
          <div className="flex items-center gap-3 min-w-0">
            <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[24px]">visibility</span>
            <div className="min-w-0">
              <h3 className="text-body-md font-bold text-on-surface dark:text-slate-100 truncate">{file.fileName}</h3>
              <p className="text-label-sm text-on-surface-variant dark:text-slate-400 font-mono">Inline Preview</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onDownload(file.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-semibold text-label-sm transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Download
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface dark:text-slate-400 dark:hover:text-slate-100 hover:bg-surface-container dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center min-h-[300px] bg-surface dark:bg-[#070d18]">
          {category === 'image' && (
            <img 
              src={fileUrl} 
              alt={file.fileName} 
              className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-sm" 
            />
          )}

          {category === 'video' && (
            <video 
              controls 
              src={fileUrl} 
              className="max-h-[65vh] max-w-full rounded-lg shadow-sm" 
            />
          )}

          {category === 'pdf' && (
            <iframe 
              src={fileUrl} 
              title={file.fileName} 
              className="w-full h-[65vh] rounded-lg border-0 shadow-sm" 
            />
          )}

          {category === 'text' && (
            <div className="w-full h-full max-h-[65vh] overflow-auto">
              {loadingText ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <span className="material-symbols-outlined animate-spin text-[32px] text-primary">progress_activity</span>
                  <span className="text-body-sm font-mono text-on-surface-variant dark:text-slate-400">Loading document text...</span>
                </div>
              ) : textError ? (
                <div className="text-center py-12 text-rose-500 font-mono">Failed to render text preview.</div>
              ) : (
                <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-body-sm leading-relaxed overflow-x-auto selection:bg-primary selection:text-white">
                  <code>{textContent}</code>
                </pre>
              )}
            </div>
          )}

          {category === 'unsupported' && (
            <div className="flex flex-col items-center justify-center text-center py-12 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-surface-container dark:bg-slate-800 flex items-center justify-center text-on-surface-variant dark:text-slate-400">
                <span className="material-symbols-outlined text-[32px]">draft</span>
              </div>
              <h4 className="text-headline-sm font-bold text-on-surface dark:text-slate-100">No Direct Preview Available</h4>
              <p className="text-body-md text-on-surface-variant dark:text-slate-400 max-w-sm">
                Preview is not supported for this file format. Click download to view the file on your device.
              </p>
              <button
                onClick={() => onDownload(file.id)}
                className="mt-2 px-4 py-2 bg-primary hover:bg-primary-container text-on-primary font-semibold rounded-xl flex items-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Download File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
