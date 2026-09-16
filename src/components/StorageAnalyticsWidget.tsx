'use client';

import { useMemo } from 'react';

interface FileData {
  id: string;
  fileName: string;
  size: number;
  uploadedAt: string;
}

interface StorageAnalyticsWidgetProps {
  files: FileData[];
}

export default function StorageAnalyticsWidget({ files }: StorageAnalyticsWidgetProps) {
  const analytics = useMemo(() => {
    const categories: Record<string, { label: string; color: string; bg: string; bytes: number; count: number }> = {
      pdf: { label: 'PDF Documents', color: 'bg-rose-500 dark:bg-rose-400', bg: 'text-rose-500', bytes: 0, count: 0 },
      media: { label: 'Images & Media', color: 'bg-indigo-500 dark:bg-indigo-400', bg: 'text-indigo-500', bytes: 0, count: 0 },
      code: { label: 'Code & Data', color: 'bg-emerald-500 dark:bg-emerald-400', bg: 'text-emerald-500', bytes: 0, count: 0 },
      archive: { label: 'Archives (ZIP)', color: 'bg-amber-500 dark:bg-amber-400', bg: 'text-amber-500', bytes: 0, count: 0 },
      other: { label: 'Other Files', color: 'bg-slate-400 dark:bg-slate-500', bg: 'text-slate-400', bytes: 0, count: 0 },
    };

    let totalBytes = 0;

    files.forEach((file) => {
      const size = file.size || 0;
      totalBytes += size;
      const ext = file.fileName.split('.').pop()?.toLowerCase() || '';

      if (['pdf'].includes(ext)) {
        categories.pdf.bytes += size;
        categories.pdf.count += 1;
      } else if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'mp4', 'webm', 'mov', 'mp3'].includes(ext)) {
        categories.media.bytes += size;
        categories.media.count += 1;
      } else if (['js', 'ts', 'jsx', 'tsx', 'py', 'c', 'cpp', 'java', 'html', 'css', 'json', 'sh', 'sql', 'txt', 'md'].includes(ext)) {
        categories.code.bytes += size;
        categories.code.count += 1;
      } else if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) {
        categories.archive.bytes += size;
        categories.archive.count += 1;
      } else {
        categories.other.bytes += size;
        categories.other.count += 1;
      }
    });

    const formatSize = (bytes: number) => {
      if (bytes === 0) return '0 MB';
      const mb = bytes / (1024 * 1024);
      if (mb < 0.1) return (bytes / 1024).toFixed(1) + ' KB';
      return mb.toFixed(1) + ' MB';
    };

    const breakdown = Object.entries(categories)
      .map(([key, item]) => ({
        key,
        ...item,
        percent: totalBytes > 0 ? (item.bytes / totalBytes) * 100 : 0,
        formattedSize: formatSize(item.bytes),
      }))
      .filter((item) => item.bytes > 0 || files.length === 0);

    return {
      totalBytes,
      formatSize,
      breakdown,
      totalFiles: files.length,
      largestFile: files.length > 0 ? [...files].sort((a, b) => b.size - a.size)[0] : null,
      lastUploaded: files.length > 0 ? [...files].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0] : null,
    };
  }, [files]);

  return (
    <div className="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/20 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-5 h-full">
      {/* Widget Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[22px] text-primary dark:text-primary-fixed-dim">analytics</span>
          <h3 className="text-body-md font-bold text-on-surface dark:text-slate-100">Storage Distribution</h3>
        </div>
        <span className="text-label-sm font-mono text-on-surface-variant dark:text-slate-400">
          {analytics.totalFiles} files
        </span>
      </div>

      {/* Multi-Segment Color Breakdown Bar */}
      <div className="w-full h-3 rounded-full bg-surface-container dark:bg-slate-800 flex overflow-hidden">
        {analytics.breakdown.map((item) => (
          <div
            key={item.key}
            className={`h-full transition-all duration-300 ${item.color}`}
            style={{ width: `${item.percent}%` }}
            title={`${item.label}: ${item.percent.toFixed(1)}% (${item.formattedSize})`}
          />
        ))}
      </div>

      {/* Category Percentage List */}
      <div className="flex flex-col gap-2.5">
        {analytics.breakdown.map((item) => (
          <div key={item.key} className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low dark:bg-slate-800/60 border border-outline-variant/10 dark:border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.color}`} />
              <span className="text-label-sm font-medium text-on-surface dark:text-slate-200 truncate">{item.label}</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-label-sm shrink-0">
              <span className="font-bold text-on-surface dark:text-slate-100">{item.percent.toFixed(1)}%</span>
              <span className="text-outline dark:text-slate-400">({item.formattedSize})</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Activity Stats */}
      {analytics.largestFile && (
        <div className="flex flex-col border-t border-outline-variant/20 dark:border-slate-800 pt-4 text-label-sm font-mono text-on-surface-variant dark:text-slate-400 gap-2 mt-auto">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary">equalizer</span>
              Largest File:
            </span>
            <span className="text-on-surface dark:text-slate-200 truncate max-w-[150px] font-semibold">{analytics.largestFile.fileName}</span>
          </div>
          {analytics.lastUploaded && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-tertiary dark:text-emerald-400">schedule</span>
                Latest Activity:
              </span>
              <span className="text-on-surface dark:text-slate-200 truncate max-w-[150px] font-semibold">{analytics.lastUploaded.fileName}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
