'use client';

import { useState } from 'react';

interface ShareConfigModalProps {
  file: {
    id: string;
    fileName: string;
  } | null;
  onClose: () => void;
  onCopied: (msg: string) => void;
}

export default function ShareConfigModal({ file, onClose, onCopied }: ShareConfigModalProps) {
  const [expiryOption, setExpiryOption] = useState<'never' | '1_download' | '1_hour' | '24_hours' | '7_days'>('never');
  const [saving, setSaving] = useState(false);

  if (!file) return null;

  const handleGenerateAndCopy = async () => {
    setSaving(true);

    try {
      await fetch(`/api/files/${file.id}/share-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiryOption }),
      });

      const url = `${window.location.origin}/share/file/${file.id}`;
      navigator.clipboard.writeText(url);

      const labels: Record<string, string> = {
        never: 'Public link (No Expiration) copied!',
        '1_download': 'Self-destructing link (1 Download) copied!',
        '1_hour': 'Expiring link (1 Hour limit) copied!',
        '24_hours': 'Expiring link (24 Hours limit) copied!',
        '7_days': 'Expiring link (7 Days limit) copied!'
      };

      onCopied(labels[expiryOption] || 'Link copied!');
      onClose();
    } catch (err) {
      console.error('Failed to configure share expiration:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[24px]">share</span>
            <div>
              <h3 className="text-body-md font-bold text-on-surface dark:text-slate-100">Share File</h3>
              <p className="text-label-sm text-on-surface-variant dark:text-slate-400 font-mono truncate max-w-[220px]">{file.fileName}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant dark:text-slate-400 hover:bg-surface-container dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Expiration Rules Selection */}
        <div className="flex flex-col gap-3">
          <label className="text-label-md font-mono font-semibold text-on-surface dark:text-slate-200 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-primary">timer</span>
            Link Expiration Rule:
          </label>

          <div className="flex flex-col gap-2">
            {[
              { id: 'never', title: 'Never (Default)', desc: 'Link remains active indefinitely' },
              { id: '1_download', title: '🔥 1 Download (Burn After Read)', desc: 'Self-destructs immediately after 1 download' },
              { id: '1_hour', title: '🕒 1 Hour', desc: 'Expires 1 hour after configuration' },
              { id: '24_hours', title: '📅 24 Hours', desc: 'Expires 24 hours after configuration' },
              { id: '7_days', title: '📆 7 Days', desc: 'Expires 7 days after configuration' }
            ].map((option) => (
              <label 
                key={option.id}
                onClick={() => setExpiryOption(option.id as any)}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  expiryOption === option.id 
                    ? 'bg-primary/10 dark:bg-primary-container/20 border-primary dark:border-primary-fixed-dim text-on-surface dark:text-slate-100' 
                    : 'bg-surface-container-low dark:bg-slate-800/60 border-outline-variant/20 dark:border-slate-800 text-on-surface-variant dark:text-slate-300 hover:border-outline-variant/60'
                }`}
              >
                <input 
                  type="radio" 
                  name="expiryOption" 
                  checked={expiryOption === option.id}
                  onChange={() => {}}
                  className="mt-0.5 text-primary focus:ring-primary"
                />
                <div className="flex flex-col">
                  <span className="text-body-sm font-semibold">{option.title}</span>
                  <span className="text-label-sm font-mono text-outline dark:text-slate-400">{option.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleGenerateAndCopy}
          disabled={saving}
          className="w-full h-11 bg-primary hover:bg-primary-container text-on-primary font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
        >
          <span className="material-symbols-outlined text-[20px]">
            {saving ? 'progress_activity' : 'content_copy'}
          </span>
          {saving ? 'Configuring Link...' : 'Copy Share Link'}
        </button>
      </div>
    </div>
  );
}
