'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import JSZip from 'jszip';
import ThemeToggle from '@/components/ThemeToggle';
import FilePreviewModal from '@/components/FilePreviewModal';

interface FileData {
  id: string;
  fileName: string;
  size: number;
  uploadedAt: string;
}

interface VaultData {
  username: string;
  totalFiles: number;
  totalUsedBytes: number;
  files: FileData[];
}

function ShareVaultContent({ username }: { username: string }) {
  const searchParams = useSearchParams();
  const expiresAtParam = searchParams.get('expiresAt');

  const [vault, setVault] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isBurnParam = searchParams.get('burn') === 'true';
  const burnStorageKey = `codedrop_burn_vault_${username}_${expiresAtParam || 'burn'}`;

  const [zipping, setZipping] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);

  useEffect(() => {
    async function loadVault() {
      // Check link expiration parameter
      if (expiresAtParam) {
        const expTime = Number(expiresAtParam);
        if (!isNaN(expTime) && Date.now() > expTime) {
          setError('This shared vault link has expired.');
          setLoading(false);
          return;
        }
      }

      // Check burn after read parameter
      if (isBurnParam && typeof window !== 'undefined') {
        const alreadyBurned = localStorage.getItem(burnStorageKey);
        if (alreadyBurned) {
          setError('This self-destructing vault link has already been burned after download.');
          setLoading(false);
          return;
        }
      }

      try {
        const res = await fetch(`/api/public/vault/${username}`);
        if (res.ok) {
          const data = await res.json();
          setVault(data);
        } else {
          setError('Shared vault not found.');
        }
      } catch (err) {
        setError('Network error loading shared vault.');
      } finally {
        setLoading(false);
      }
    }
    loadVault();
  }, [username, expiresAtParam, isBurnParam, burnStorageKey]);

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

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const markBurnIfActive = () => {
    if (isBurnParam && typeof window !== 'undefined') {
      localStorage.setItem(burnStorageKey, 'burned');
    }
  };

  const handleDownload = (id: string) => {
    markBurnIfActive();
    window.open(`/api/public/files/${id}/download`, '_blank');
  };

  const handleDownloadZip = async () => {
    if (!vault || vault.files.length === 0) return;
    setZipping(true);

    try {
      const zip = new JSZip();

      for (const file of vault.files) {
        try {
          const res = await fetch(`/api/public/files/${file.id}/download`);
          if (res.ok) {
            const blob = await res.blob();
            zip.file(file.fileName, blob);
          }
        } catch (err) {
          console.error(`Failed to fetch ${file.fileName} for public ZIP:`, err);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `codedrop-vault-${username}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      markBurnIfActive();
    } catch (err) {
      console.error('ZIP generation error:', err);
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="min-h-screen bg-background dark:bg-[#0b1324] text-on-surface dark:text-slate-100">
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownload}
        isPublic={true}
      />

      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-surface/90 dark:bg-[#0b1324]/90 backdrop-blur-md border-b border-outline-variant/30 dark:border-slate-800">
        <div className="h-16 max-w-5xl mx-auto px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-surface-container-low dark:bg-slate-800 flex items-center justify-center shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 12L12 22L22 12L12 2Z" fill="#00685f" />
              </svg>
            </div>
            <span className="text-headline-sm font-bold tracking-tight">CodeDrop</span>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-container dark:bg-slate-800 text-primary dark:text-primary-fixed-dim text-label-sm font-mono">
              Public Vault
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-10 pt-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="material-symbols-outlined animate-spin text-[36px] text-primary dark:text-primary-fixed-dim">progress_activity</span>
            <span className="text-body-md text-on-surface-variant dark:text-slate-400 font-mono">Loading shared vault...</span>
          </div>
        ) : error ? (
          <div className="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/20 dark:border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-[40px] text-rose-500">error</span>
            <h2 className="text-headline-sm font-bold text-on-surface dark:text-slate-100">Vault Not Available</h2>
            <p className="text-body-md text-on-surface-variant dark:text-slate-400">{error}</p>
          </div>
        ) : vault ? (
          <div className="flex flex-col gap-8">
            {/* Vault Banner */}
            <div className="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/20 dark:border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-primary-fixed-dim font-bold text-[24px]">
                  @{vault.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-headline-sm font-bold text-on-surface dark:text-slate-100">@{vault.username}&apos;s Public Storage</h1>
                  <p className="text-body-sm text-on-surface-variant dark:text-slate-400 font-mono mt-0.5">
                    {vault.totalFiles} files • {formatFileSize(vault.totalUsedBytes)} shared
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {vault.files.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    disabled={zipping}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-container text-on-primary font-semibold rounded-xl text-label-md transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {zipping ? 'progress_activity' : 'download_for_offline'}
                    </span>
                    {zipping ? 'Building ZIP...' : 'Download Vault as ZIP'}
                  </button>
                )}
              </div>
            </div>

            {/* File List */}
            <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden border border-outline-variant/20 dark:border-slate-800">
              <div className="hidden md:grid md:grid-cols-12 md:gap-4 bg-surface-container-low dark:bg-slate-800/80 px-6 py-3 border-b border-outline-variant/20 dark:border-slate-800">
                <div className="col-span-6 text-label-sm text-on-surface-variant dark:text-slate-400 uppercase tracking-wider font-mono font-medium">File Name</div>
                <div className="col-span-2 text-label-sm text-on-surface-variant dark:text-slate-400 uppercase tracking-wider font-mono font-medium">Size</div>
                <div className="col-span-2 text-label-sm text-on-surface-variant dark:text-slate-400 uppercase tracking-wider font-mono font-medium">Uploaded</div>
                <div className="col-span-2 text-label-sm text-on-surface-variant dark:text-slate-400 uppercase tracking-wider font-mono font-medium text-right">Actions</div>
              </div>

              <div className="flex flex-col">
                {vault.files.length === 0 ? (
                  <div className="p-12 text-center text-on-surface-variant dark:text-slate-400 font-mono">
                    This vault is currently empty.
                  </div>
                ) : (
                  vault.files.map((file) => (
                    <div key={file.id} className="group flex flex-col md:grid md:grid-cols-12 md:items-center gap-3 md:gap-4 px-5 sm:px-6 py-4 transition-colors hover:bg-surface-container-low dark:hover:bg-slate-800/60 border-b border-outline-variant/10 dark:border-slate-800/60 last:border-0">
                      <div 
                        onClick={() => setPreviewFile(file)}
                        className="col-span-6 flex items-center gap-4 overflow-hidden cursor-pointer"
                      >
                        <div className="w-10 h-10 shrink-0 rounded-xl bg-surface-container dark:bg-slate-800 flex items-center justify-center text-primary dark:text-primary-fixed-dim shadow-sm hover:bg-primary/10 transition-colors">
                          <span className="material-symbols-outlined text-[22px]">{getFileIcon(file.fileName)}</span>
                        </div>
                        <span className="text-body-md font-semibold text-on-surface dark:text-slate-100 truncate group-hover:text-primary dark:group-hover:text-primary-fixed-dim transition-colors">
                          {file.fileName}
                        </span>
                      </div>
                      <div className="col-span-2 hidden md:block font-mono text-label-md text-on-surface-variant dark:text-slate-400">
                        {formatFileSize(file.size)}
                      </div>
                      <div className="col-span-2 hidden md:block text-body-sm text-on-surface-variant dark:text-slate-400">
                        {formatDate(file.uploadedAt)}
                      </div>
                      <div className="col-span-2 flex items-center md:justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewFile(file)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary dark:text-slate-400 dark:hover:text-primary-fixed-dim hover:bg-primary/10 transition-colors"
                          title="Preview File"
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(file.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 dark:bg-primary/20 hover:bg-primary text-primary hover:text-on-primary dark:text-primary-fixed-dim rounded-lg transition-colors font-semibold text-label-sm"
                        >
                          <span className="material-symbols-outlined text-[16px]">download</span>
                          Download
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default function ShareVaultPage({ params }: { params: { username: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background dark:bg-[#0b1324] flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[36px] text-primary">progress_activity</span>
      </div>
    }>
      <ShareVaultContent username={params.username} />
    </Suspense>
  );
}
