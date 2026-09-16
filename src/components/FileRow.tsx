'use client';

import { useState } from 'react';

interface FileData {
  id: string;
  fileName: string;
  size: number;
  uploadedAt: string;
}

interface FileRowProps {
  file: FileData;
  isSelected: boolean;
  onSelectToggle: (id: string) => void;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
}

export default function FileRow({ 
  file, 
  isSelected, 
  onSelectToggle, 
  onDownload, 
  onDelete, 
  onShare 
}: FileRowProps) {
  const [copied, setCopied] = useState(false);

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare(file.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFileIcon = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['zip', 'tar', 'gz', 'rar'].includes(ext)) return 'folder_zip';
    if (['pdf'].includes(ext)) return 'picture_as_pdf';
    if (['json', 'js', 'ts', 'py', 'c', 'cpp', 'java', 'html', 'css', 'tsx', 'jsx'].includes(ext)) return 'code';
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'movie';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
    return 'description';
  };

  const getExt = (fileName: string): string => {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop()?.toUpperCase() || 'FILE' : 'FILE';
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
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className={`group flex flex-col md:grid md:grid-cols-12 md:items-center gap-3 md:gap-4 px-5 sm:px-6 py-4 transition-colors border-b border-outline-variant/10 dark:border-slate-800/60 last:border-0 ${
      isSelected 
        ? 'bg-primary/5 dark:bg-slate-800/90' 
        : 'hover:bg-surface-container-low dark:hover:bg-slate-800/60'
    }`}>
      
      {/* Selection Checkbox & File Identity */}
      <div className="col-span-6 flex items-center gap-3 overflow-hidden">
        <input 
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelectToggle(file.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-outline dark:border-slate-600 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer shrink-0"
        />
        <div className="w-10 h-10 shrink-0 rounded-xl bg-surface-container dark:bg-slate-800 flex items-center justify-center text-primary dark:text-primary-fixed-dim shadow-sm">
          <span className="material-symbols-outlined text-[22px]">{getFileIcon(file.fileName)}</span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-body-md font-semibold text-on-surface dark:text-slate-100 truncate group-hover:text-primary dark:group-hover:text-primary-fixed-dim transition-colors">
            {file.fileName}
          </span>
          <span className="text-label-sm text-outline dark:text-slate-400 font-mono mt-0.5">
            {getExt(file.fileName)}
          </span>
        </div>
      </div>

      {/* Size */}
      <div className="col-span-2 hidden md:block">
        <span className="font-mono text-label-md text-on-surface-variant dark:text-slate-400">
          {formatFileSize(file.size)}
        </span>
      </div>

      {/* Upload Date */}
      <div className="col-span-2 hidden md:block">
        <span className="text-body-sm text-on-surface-variant dark:text-slate-400">
          {formatDate(file.uploadedAt)}
        </span>
      </div>

      {/* Actions */}
      <div className="col-span-2 flex items-center md:justify-end gap-1 mt-2 md:mt-0">
        <div className="md:hidden flex-1 flex items-center gap-4 text-on-surface-variant dark:text-slate-400">
          <span className="font-mono text-label-md">{formatFileSize(file.size)}</span>
          <span className="text-body-sm">• {formatDate(file.uploadedAt)}</span>
        </div>
        
        {/* Share Button */}
        <button
          type="button"
          onClick={handleShareClick}
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors focus:outline-none ${
            copied 
              ? 'text-tertiary dark:text-emerald-400 bg-tertiary/10 dark:bg-emerald-950/40' 
              : 'text-on-surface-variant dark:text-slate-400 hover:text-primary dark:hover:text-primary-fixed-dim hover:bg-primary/10 dark:hover:bg-primary/20'
          }`}
          title={copied ? "Link Copied!" : "Share Link"}
        >
          <span className="material-symbols-outlined text-[20px]">
            {copied ? 'check' : 'share'}
          </span>
        </button>

        {/* Download Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDownload(file.id);
          }}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-variant dark:text-slate-400 hover:text-primary dark:hover:text-primary-fixed-dim hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors focus:outline-none"
          title="Download"
        >
          <span className="material-symbols-outlined text-[20px]">download</span>
        </button>

        {/* Delete Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(file.id);
          }}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-variant dark:text-slate-400 hover:text-error dark:hover:text-rose-400 hover:bg-error-container/40 dark:hover:bg-rose-950/40 transition-colors focus:outline-none"
          title="Delete"
        >
          <span className="material-symbols-outlined text-[20px]">delete</span>
        </button>
      </div>
    </div>
  );
}
