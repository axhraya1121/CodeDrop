'use client';

interface StorageBarProps {
  usedBytes: number;
}

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

export default function StorageBar({ usedBytes }: StorageBarProps) {
  const percent = Math.min(100, Math.max(0, (usedBytes / MAX_BYTES) * 100));
  
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 0.1) {
      return (bytes / 1024).toFixed(1) + ' KB';
    }
    return mb.toFixed(1) + ' MB';
  };

  const getBarColor = () => {
    if (percent >= 90) return 'bg-rose-500 dark:bg-rose-400';
    if (percent >= 75) return 'bg-amber-500 dark:bg-amber-400';
    return 'bg-primary dark:bg-primary-fixed-dim';
  };

  const remainingMB = Math.max(0, 100 - (usedBytes / (1024 * 1024))).toFixed(1);

  return (
    <div className="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/20 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4">
      {/* Widget Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-primary-fixed-dim">
            <span className="material-symbols-outlined text-[18px]">hard_drive</span>
          </div>
          <span className="text-body-sm font-bold text-on-surface dark:text-slate-100">Storage Usage</span>
        </div>
        <span className="text-label-sm font-mono font-bold px-2.5 py-0.5 rounded-full bg-surface-container dark:bg-slate-800 text-primary dark:text-primary-fixed-dim">
          {percent.toFixed(1)}%
        </span>
      </div>

      {/* Metric Display */}
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1.5 font-mono">
          <span className="text-headline-sm font-bold text-on-surface dark:text-slate-100">
            {formatSize(usedBytes)}
          </span>
          <span className="text-body-sm text-on-surface-variant dark:text-slate-400 font-medium">
            / 100 MB
          </span>
        </div>
        <span className="text-label-sm font-mono text-outline dark:text-slate-400 mt-0.5">
          {remainingMB} MB remaining
        </span>
      </div>

      {/* Progress Bar Container */}
      <div className="w-full h-2 rounded-full bg-surface-container dark:bg-slate-800 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-300 ease-out ${getBarColor()}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {percent >= 90 && (
        <p className="text-label-sm text-rose-500 dark:text-rose-400 flex items-center gap-1 font-mono">
          <span className="material-symbols-outlined text-[14px]">warning</span>
          Quota almost full
        </p>
      )}
    </div>
  );
}
