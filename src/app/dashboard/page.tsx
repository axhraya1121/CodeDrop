'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import DropZone from '@/components/DropZone';
import FileRow from '@/components/FileRow';
import StorageBar from '@/components/StorageBar';

interface FileData {
  id: string;
  fileName: string;
  size: number;
  uploadedAt: string;
}

export default function Dashboard() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ fileName: string; percent: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [username, setUsername] = useState('User');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const totalUsedBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/files');
      if (res.ok) {
        const data = await res.json();
        setFiles(Array.isArray(data) ? data : (data.files || []));
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    } fontally: {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    // Tab session verification
    const activeSession = sessionStorage.getItem('codedrop_active_session');
    if (!activeSession) {
      fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
        window.location.href = '/';
      });
      return;
    }

    // Fetch user profile
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.username) setUsername(data.username);
      })
      .catch(() => {});

    fetchFiles();
  }, []);

  const handleUpload = async (fileList: FileList) => {
    const filesToUpload = Array.from(fileList);
    if (filesToUpload.length === 0) return;

    setUploading(true);
    setUploadError(null);

    const errors: string[] = [];

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const batchLabel = filesToUpload.length > 1 ? `[${i + 1}/${filesToUpload.length}] ${file.name}` : file.name;

      setUploadProgress({
        fileName: batchLabel,
        percent: 0
      });

      await new Promise<void>((resolve) => {
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/files/upload', true);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setUploadProgress({ fileName: batchLabel, percent });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            try {
              const data = JSON.parse(xhr.responseText);
              errors.push(`${file.name}: ${data.error || 'Upload failed'}`);
            } catch {
              errors.push(`${file.name}: Upload failed (${xhr.status})`);
            }
            resolve();
          }
        };

        xhr.onerror = () => {
          errors.push(`${file.name}: Network error`);
          resolve();
        };

        xhr.send(formData);
      });
    }

    await fetchFiles();
    setUploading(false);
    setTimeout(() => setUploadProgress(null), 1000);

    if (errors.length > 0) {
      setUploadError(errors.join(' | '));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    const targetFile = files.find(f => f.id === id);
    setFiles(prev => prev.filter(f => f.id !== id));
    setUploadError(null);

    try {
      const res = await fetch(`/api/files/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!res.ok) {
        if (targetFile) {
          setFiles(prev => prev.some(f => f.id === id) ? prev : [...prev, targetFile]);
        }
        try {
          const data = await res.json();
          setUploadError(data.error || `Delete failed (${res.status})`);
        } catch {
          setUploadError(`Delete failed with HTTP status ${res.status}`);
        }
      }
    } catch (err: any) {
      console.error('Delete network error:', err);
      if (targetFile) {
        setFiles(prev => prev.some(f => f.id === id) ? prev : [...prev, targetFile]);
      }
      setUploadError(err.message || 'Network error while deleting file');
    }
  };

  const handleDownload = (id: string) => {
    window.open(`/api/files/${id}/download`, '_blank');
  };

  const handleShareFile = (id: string) => {
    const url = `${window.location.origin}/share/file/${id}`;
    navigator.clipboard.writeText(url);
    showToast('Public file link copied to clipboard!');
  };

  const handleShareVault = () => {
    const url = `${window.location.origin}/share/vault/${username}`;
    navigator.clipboard.writeText(url);
    showToast('Public vault link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Header username={username} />
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-container-lowest dark:bg-slate-900 text-on-surface dark:text-slate-100 px-4 py-3 rounded-xl shadow-lg border border-primary/30 dark:border-primary-fixed-dim/30 flex items-center gap-2 font-mono text-label-md animate-bounce">
          <span className="material-symbols-outlined text-tertiary dark:text-emerald-400 text-[18px]">check_circle</span>
          {toastMessage}
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-10 pt-24">
        
        {/* Storage Bar */}
        <StorageBar usedBytes={totalUsedBytes} />

        {/* Upload Section */}
        <section className="mb-12">
          {uploadError && (
            <div className="mb-4 p-4 rounded-xl bg-error-container text-on-error-container border border-error/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-error">error</span>
                <span className="text-body-sm font-medium">{uploadError}</span>
              </div>
              <button onClick={() => setUploadError(null)} className="text-on-error-container hover:text-error">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          )}

          <DropZone 
            onUpload={handleUpload} 
            uploading={uploading} 
            uploadProgress={uploadProgress} 
          />
        </section>

        {/* Files Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-headline-md font-bold text-on-surface dark:text-slate-100">Your Files</h2>
              {!loading && (
                <span className="px-2.5 py-0.5 rounded-full bg-surface-container dark:bg-slate-800 text-on-surface-variant dark:text-slate-300 text-label-sm font-mono">
                  {files.length}
                </span>
              )}
            </div>

            {/* Share Entire Vault Button */}
            <button
              type="button"
              onClick={handleShareVault}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-surface-container dark:bg-slate-800 hover:bg-primary/10 text-primary dark:text-primary-fixed-dim font-mono text-label-sm font-semibold transition-colors border border-outline-variant/30 dark:border-slate-700"
              title="Share link to your entire public storage"
            >
              <span className="material-symbols-outlined text-[18px]">folder_shared</span>
              Share Vault
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <span className="material-symbols-outlined animate-spin text-[32px] text-primary dark:text-primary-fixed-dim">progress_activity</span>
            </div>
          ) : files.length === 0 ? (
            <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl shadow-sm border border-outline-variant/20 dark:border-slate-800 p-12 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 mb-5 rounded-3xl bg-surface-container dark:bg-slate-800 flex items-center justify-center text-on-surface-variant dark:text-slate-300 relative">
                <span className="material-symbols-outlined text-[40px]">vault</span>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">upload</span>
                </div>
              </div>
              <h3 className="text-headline-sm font-bold text-on-surface dark:text-slate-100 mb-2">No files uploaded yet</h3>
              <p className="text-body-md text-on-surface-variant dark:text-slate-400 max-w-md">
                Drop a file above or click to upload your first private file.
              </p>
            </div>
          ) : (
            <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden border border-outline-variant/20 dark:border-slate-800">
              {/* Table Header */}
              <div className="hidden md:grid md:grid-cols-12 md:gap-4 bg-surface-container-low dark:bg-slate-800/80 px-6 py-3 border-b border-outline-variant/20 dark:border-slate-800">
                <div className="col-span-6 text-label-sm text-on-surface-variant dark:text-slate-400 uppercase tracking-wider font-mono font-medium">File Name</div>
                <div className="col-span-2 text-label-sm text-on-surface-variant dark:text-slate-400 uppercase tracking-wider font-mono font-medium">Size</div>
                <div className="col-span-2 text-label-sm text-on-surface-variant dark:text-slate-400 uppercase tracking-wider font-mono font-medium">Uploaded</div>
                <div className="col-span-2 text-label-sm text-on-surface-variant dark:text-slate-400 uppercase tracking-wider font-mono font-medium text-right">Actions</div>
              </div>
              
              {/* File List */}
              <div className="flex flex-col">
                {files.map((file) => (
                  <FileRow 
                    key={file.id} 
                    file={file} 
                    onDownload={handleDownload} 
                    onDelete={handleDelete}
                    onShare={handleShareFile}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
