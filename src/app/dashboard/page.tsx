'use client';

import { useState, useEffect, useMemo } from 'react';
import JSZip from 'jszip';
import Header from '@/components/Header';
import DropZone from '@/components/DropZone';
import FileRow from '@/components/FileRow';
import StorageBar from '@/components/StorageBar';
import FilePreviewModal from '@/components/FilePreviewModal';
import GlobalDragOverlay from '@/components/GlobalDragOverlay';

interface FileData {
  id: string;
  fileName: string;
  size: number;
  uploadedAt: string;
}

export default function Dashboard() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ fileName: string; percent: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [username, setUsername] = useState('User');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // New State Features
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'documents' | 'media' | 'code' | 'zip'>('all');
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [zipping, setZipping] = useState(false);

  const totalUsedBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/files');
      if (res.ok) {
        const data = await res.json();
        const fileList = Array.isArray(data) ? data : (data.files || []);
        setFiles(fileList);
        setSelectedIds(prev => new Set(Array.from(prev).filter(id => fileList.some((f: FileData) => f.id === id))));
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const activeSession = sessionStorage.getItem('codedrop_active_session');
    if (!activeSession) {
      fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
        window.location.href = '/';
      });
      return;
    }

    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.username) setUsername(data.username);
      })
      .catch(() => {});

    fetchFiles();
  }, []);

  // Filter & Search Logic (Feature #1)
  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const nameMatch = file.fileName.toLowerCase().includes(searchQuery.toLowerCase());
      if (!nameMatch) return false;

      if (filterCategory === 'all') return true;
      const ext = file.fileName.split('.').pop()?.toLowerCase() || '';

      if (filterCategory === 'documents') return ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'].includes(ext);
      if (filterCategory === 'media') return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'mp4', 'webm', 'mov', 'avi', 'mp3', 'wav'].includes(ext);
      if (filterCategory === 'code') return ['js', 'ts', 'jsx', 'tsx', 'py', 'c', 'cpp', 'java', 'html', 'css', 'json', 'sh', 'sql', 'yml'].includes(ext);
      if (filterCategory === 'zip') return ['zip', 'tar', 'gz', 'rar', '7z'].includes(ext);

      return true;
    });
  }, [files, searchQuery, filterCategory]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredFiles.length && filteredFiles.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFiles.map(f => f.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setUploadError(null);

    try {
      const res = await fetch(`/api/files/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Cache-Control': 'no-cache' }
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
      } else {
        showToast('File deleted successfully.');
      }
    } catch (err: any) {
      if (targetFile) {
        setFiles(prev => prev.some(f => f.id === id) ? prev : [...prev, targetFile]);
      }
      setUploadError(err.message || 'Network error while deleting file');
    }
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${ids.length} selected files?`)) return;

    const previousFiles = [...files];
    setFiles(prev => prev.filter(f => !selectedIds.has(f.id)));
    setSelectedIds(new Set());
    setUploadError(null);

    try {
      const res = await fetch('/api/files/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: ids }),
      });

      if (!res.ok) {
        setFiles(previousFiles);
        const data = await res.json();
        setUploadError(data.error || 'Failed to delete selected files');
      } else {
        const data = await res.json();
        showToast(`${data.deletedCount || ids.length} files deleted successfully.`);
        await fetchFiles();
      }
    } catch (err: any) {
      setFiles(previousFiles);
      setUploadError('Network error deleting selected files.');
    }
  };

  const handleDeleteAll = async () => {
    if (files.length === 0) return;
    if (!confirm('WARNING: Are you sure you want to delete ALL files from your vault? This cannot be undone.')) return;

    const previousFiles = [...files];
    setFiles([]);
    setSelectedIds(new Set());
    setUploadError(null);

    try {
      const res = await fetch('/api/files/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteAll: true }),
      });

      if (!res.ok) {
        setFiles(previousFiles);
        const data = await res.json();
        setUploadError(data.error || 'Failed to purge vault');
      } else {
        showToast('All files purged from vault.');
        await fetchFiles();
      }
    } catch (err) {
      setFiles(previousFiles);
      setUploadError('Network error purging vault.');
    }
  };

  // ZIP Download Logic (Feature #5)
  const handleDownloadZip = async (selectedOnly = false) => {
    const targetList = selectedOnly 
      ? files.filter(f => selectedIds.has(f.id))
      : files;

    if (targetList.length === 0) return;

    setZipping(true);
    showToast(`Packaging ${targetList.length} files into ZIP archive...`);

    try {
      const zip = new JSZip();

      for (const file of targetList) {
        try {
          const res = await fetch(`/api/files/${file.id}/download`);
          if (res.ok) {
            const blob = await res.blob();
            zip.file(file.fileName, blob);
          }
        } catch (err) {
          console.error(`Failed to fetch ${file.fileName} for ZIP:`, err);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedOnly ? `codedrop-selected-${username}.zip` : `codedrop-vault-${username}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('ZIP archive downloaded successfully!');
    } catch (err) {
      setUploadError('Failed to generate ZIP package.');
    } finally {
      setZipping(false);
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
    <div className="min-h-screen bg-background text-on-surface relative">
      <Header username={username} />
      
      {/* Global Drag and Drop Overlay (Feature #6) */}
      <GlobalDragOverlay onDropFiles={handleUpload} />

      {/* File Preview Modal (Feature #2) */}
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownload}
      />

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
        <section className="mb-10">
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

        {/* Search & Category Filter Bar (Feature #1) */}
        <section className="mb-8 bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/20 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex items-center w-full md:max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 text-outline dark:text-slate-400 text-[20px]">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files by name or extension (e.g. .pdf, code)..."
              className="w-full h-10 pl-10 pr-4 bg-surface-container-low dark:bg-slate-800/80 rounded-xl text-body-sm text-on-surface dark:text-slate-100 placeholder:text-outline/70 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-colors border border-transparent dark:border-slate-700/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-outline dark:text-slate-400 hover:text-on-surface dark:hover:text-slate-100"
              >
                <span className="material-symbols-outlined text-[16px]">cancel</span>
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'All Files' },
              { id: 'documents', label: 'Docs' },
              { id: 'media', label: 'Media' },
              { id: 'code', label: 'Code' },
              { id: 'zip', label: 'Archives' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilterCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-lg text-label-sm font-mono font-medium transition-colors shrink-0 ${
                  filterCategory === cat.id
                    ? 'bg-primary dark:bg-primary-container text-on-primary shadow-sm'
                    : 'bg-surface-container dark:bg-slate-800 text-on-surface-variant dark:text-slate-400 hover:text-on-surface dark:hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </section>

        {/* Files Section */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-headline-md font-bold text-on-surface dark:text-slate-100">Your Files</h2>
              {!loading && (
                <span className="px-2.5 py-0.5 rounded-full bg-surface-container dark:bg-slate-800 text-on-surface-variant dark:text-slate-300 text-label-sm font-mono">
                  {filteredFiles.length} of {files.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Download Selected as ZIP */}
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => handleDownloadZip(true)}
                  disabled={zipping}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-fixed-dim font-mono text-label-sm font-semibold transition-colors border border-primary/20"
                >
                  <span className="material-symbols-outlined text-[18px]">folder_zip</span>
                  ZIP Selected ({selectedIds.size})
                </button>
              )}

              {/* Delete Selected Button */}
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-mono text-label-sm font-semibold transition-colors border border-rose-500/20"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Delete Selected ({selectedIds.size})
                </button>
              )}

              {/* Download All as ZIP (Feature #5) */}
              {files.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleDownloadZip(false)}
                  disabled={zipping}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container dark:bg-slate-800 hover:bg-primary/10 text-primary dark:text-primary-fixed-dim font-mono text-label-sm font-semibold transition-colors border border-outline-variant/30 dark:border-slate-700"
                  title="Compress and download all files into a single ZIP archive"
                >
                  <span className="material-symbols-outlined text-[18px]">download_for_offline</span>
                  Download ZIP
                </button>
              )}

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

              {/* Delete All Files Button */}
              {files.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container dark:bg-slate-800 hover:bg-rose-500/10 text-on-surface-variant dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-mono text-label-sm font-medium transition-colors border border-outline-variant/30 dark:border-slate-700"
                  title="Purge all files from storage"
                >
                  <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                  Delete All
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <span className="material-symbols-outlined animate-spin text-[32px] text-primary dark:text-primary-fixed-dim">progress_activity</span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl shadow-sm border border-outline-variant/20 dark:border-slate-800 p-12 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 mb-5 rounded-3xl bg-surface-container dark:bg-slate-800 flex items-center justify-center text-on-surface-variant dark:text-slate-300 relative">
                <span className="material-symbols-outlined text-[40px]">
                  {searchQuery || filterCategory !== 'all' ? 'search_off' : 'vault'}
                </span>
              </div>
              <h3 className="text-headline-sm font-bold text-on-surface dark:text-slate-100 mb-2">
                {searchQuery || filterCategory !== 'all' ? 'No matching files found' : 'No files uploaded yet'}
              </h3>
              <p className="text-body-md text-on-surface-variant dark:text-slate-400 max-w-md">
                {searchQuery || filterCategory !== 'all' 
                  ? 'Try changing your search keywords or filter category.' 
                  : 'Drop a file above or click to upload your first private file.'}
              </p>
            </div>
          ) : (
            <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden border border-outline-variant/20 dark:border-slate-800">
              {/* Table Header */}
              <div className="hidden md:grid md:grid-cols-12 md:gap-4 bg-surface-container-low dark:bg-slate-800/80 px-6 py-3 border-b border-outline-variant/20 dark:border-slate-800 items-center">
                <div className="col-span-6 flex items-center gap-3 text-label-sm text-on-surface-variant dark:text-slate-400 uppercase tracking-wider font-mono font-medium">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredFiles.length && filteredFiles.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-outline dark:border-slate-600 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                    title="Select All Files"
                  />
                  File Name
                </div>
                <div className="col-span-2 text-label-sm text-on-surface-variant dark:text-slate-400 uppercase tracking-wider font-mono font-medium">Size</div>
                <div className="col-span-2 text-label-sm text-on-surface-variant dark:text-slate-400 uppercase tracking-wider font-mono font-medium">Uploaded</div>
                <div className="col-span-2 text-label-sm text-on-surface-variant dark:text-slate-400 uppercase tracking-wider font-mono font-medium text-right">Actions</div>
              </div>
              
              {/* File List */}
              <div className="flex flex-col">
                {filteredFiles.map((file) => (
                  <FileRow 
                    key={file.id} 
                    file={file} 
                    isSelected={selectedIds.has(file.id)}
                    onSelectToggle={toggleSelectOne}
                    onDownload={handleDownload} 
                    onDelete={handleDelete}
                    onShare={handleShareFile}
                    onPreview={(f) => setPreviewFile(f)}
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
