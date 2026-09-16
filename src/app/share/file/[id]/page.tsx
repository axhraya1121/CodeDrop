'use client';

import { useState, useEffect } from 'react';
import ThemeToggle from '@/components/ThemeToggle';

interface FileInfo {
  id: string;
  fileName: string;
  size: number;
  uploadedAt: string;
  owner: string;
}

export default function ShareFilePage({ params }: { params: { id: string } }) {
  const fileId = params.id;

  const [file, setFile] = useState<FileInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFile() {
      try {
        const res = await fetch(`/api/public/files/${fileId}`);
        if (res.ok) {
          const data = await res.json();
          setFile(data);
        } else {
          setError('File not found or link has expired.');
        }
      } catch (err) {
        setError('Network error loading shared file.');
      } finally {
        setLoading(false);
      }
    }
    loadFile();
  }, [fileId]);

  const getFileIcon = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['zip', 'tar', 'gz', 'rar'].includes(ext)) return 'folder_zip';
    if (['pdf'].includes(ext)) return 'picture_as_pdf';
    if (['json', 'js', 'ts', 'py', 'c', 'cpp', 'java', 'html', 'css', 'tsx', 'jsx'].includes(ext)) return 'code';
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'movie';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
    return 'description';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = () => {
    window.open(`/api/public/files/${fileId}/download`, '_blank');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 bg-background dark:bg-[#0b1324] text-on-surface dark:text-slate-100">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-surface-container-low dark:bg-slate-800 flex items-center justify-center mb-3.5 shadow-sm">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 12L12 22L22 12L12 2Z" fill="#00685f" />
            </svg>
          </div>
          <h1 className="text-headline-md font-bold text-on-surface dark:text-slate-100 flex items-center gap-2">
            CodeDrop
            <span className="bg-surface-container dark:bg-slate-800 text-primary dark:text-primary-fixed-dim px-2 py-0.5 rounded-full text-label-sm font-mono">Shared Payload</span>
          </h1>
          <p className="text-body-sm text-on-surface-variant dark:text-slate-400 mt-1">Direct public download. No login required.</p>
        </div>

        {/* Card */}
        <div className="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-sm p-6 sm:p-8 flex flex-col">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <span className="material-symbols-outlined animate-spin text-[32px] text-primary dark:text-primary-fixed-dim">progress_activity</span>
              <span className="text-body-sm text-on-surface-variant dark:text-slate-400 font-mono">Loading shared file...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">error</span>
              </div>
              <h3 className="text-headline-sm font-semibold text-on-surface dark:text-slate-100">File Unavailable</h3>
              <p className="text-body-sm text-on-surface-variant dark:text-slate-400 max-w-xs">{error}</p>
            </div>
          ) : file ? (
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-low dark:bg-slate-800/80 border border-outline-variant/20 dark:border-slate-800">
                <div className="w-12 h-12 shrink-0 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-primary-fixed-dim">
                  <span className="material-symbols-outlined text-[28px]">{getFileIcon(file.fileName)}</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="text-body-md font-semibold text-on-surface dark:text-slate-100 truncate">{file.fileName}</h3>
                  <div className="flex items-center gap-3 mt-1 font-mono text-label-sm text-on-surface-variant dark:text-slate-400">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>Shared by @{file.owner}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="w-full h-12 bg-primary hover:bg-primary-container dark:bg-primary-container text-on-primary font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
              >
                <span className="material-symbols-outlined text-[22px]">download</span>
                Download Payload ({formatFileSize(file.size)})
              </button>

              <div className="flex items-center justify-between text-label-sm text-on-surface-variant dark:text-slate-400 font-mono border-t border-outline-variant/20 dark:border-slate-800 pt-4">
                <span>End-to-end Encrypted</span>
                <span>CodeDrop Transfer</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
