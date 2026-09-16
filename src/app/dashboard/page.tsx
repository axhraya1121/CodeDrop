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
    } finally {
      setLoading(false);
    }
  };

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUsername(data.username);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  };

  useEffect(() => {
    const isTabSessionActive = sessionStorage.getItem('codedrop_active_session');
    if (!isTabSessionActive) {
      // Tab was closed or reopened — clear session and force login
      fetch('/api/auth/logout', { method: 'POST' }).then(() => {
        window.location.href = '/';
      });
      return;
    }

    fetchFiles();
    fetchUser();
  }, []);

  const uploadSingleFile = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      setUploadProgress({ fileName: file.name, percent: 0 });

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress({ fileName: file.name, percent: percentComplete });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          try {
            const res = JSON.parse(xhr.responseText);
            reject(new Error(res.error || 'Upload failed'));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.open('POST', '/api/files/upload', true);
      xhr.send(formData);
    });
  };

  const handleUpload = async (fileList: FileList) => {
    setUploading(true);
    setUploadError(null);

    try {
      for (let i = 0; i < fileList.length; i++) {
        await uploadSingleFile(fileList[i]);
      }
      await fetchFiles();
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadError(err.message || 'Upload failed. Please check database/storage configuration.');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(null), 1000);
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
        // Safe rollback using functional update
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

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Header username={username} />
      
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
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-headline-md font-bold text-on-surface dark:text-slate-100">Your Files</h2>
            {!loading && (
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container dark:bg-slate-800 text-on-surface-variant dark:text-slate-300 text-label-sm font-mono">
                {files.length}
              </span>
            )}
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
