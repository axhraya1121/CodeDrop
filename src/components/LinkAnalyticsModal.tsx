'use client';

import React, { useEffect, useState } from 'react';

interface LinkAnalyticsModalProps {
  isOpen: boolean;
  fileId: string | null;
  fileName?: string;
  onClose: () => void;
}

interface AnalyticsData {
  id: string;
  fileName: string;
  viewCount: number;
  downloadCount: number;
  maxDownloads: number | null;
  expiresAt: string | null;
  viewOnly: boolean;
  accessLogs: Array<{
    id: string;
    accessType: string;
    ipAddress: string | null;
    userAgent: string | null;
    region: string | null;
    accessedAt: string;
  }>;
}

export default function LinkAnalyticsModal({ isOpen, fileId, fileName, onClose }: LinkAnalyticsModalProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !fileId) return;

    async function fetchAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/files/${fileId}/analytics`);
        if (!res.ok) {
          throw new Error('Failed to load analytics');
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || 'Error fetching analytics');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [isOpen, fileId]);

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl max-h-[85vh] rounded-2xl bg-surface-container-lowest p-6 shadow-xl border border-outline-variant/30 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20 mb-4">
          <div className="flex items-center gap-2 text-primary font-bold text-headline-sm truncate">
            <span className="material-symbols-outlined text-[24px]">analytics</span>
            <span className="truncate">Link Analytics: {fileName || data?.fileName || 'File'}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-on-surface-variant gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-body-sm font-mono">Loading analytics...</span>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-error font-mono text-body-sm">{error}</div>
        ) : data ? (
          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20">
                <span className="text-label-xs font-mono uppercase text-on-surface-variant">Views</span>
                <p className="text-headline-md font-bold text-primary mt-1">{data.viewCount}</p>
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20">
                <span className="text-label-xs font-mono uppercase text-on-surface-variant">Downloads</span>
                <p className="text-headline-md font-bold text-secondary mt-1">
                  {data.downloadCount}
                  {data.maxDownloads ? <span className="text-body-xs font-normal text-on-surface-variant">/{data.maxDownloads}</span> : ''}
                </p>
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20">
                <span className="text-label-xs font-mono uppercase text-on-surface-variant">View-Only</span>
                <p className="text-label-md font-semibold mt-1">
                  {data.viewOnly ? (
                    <span className="text-tertiary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">lock</span> Active
                    </span>
                  ) : (
                    <span className="text-on-surface-variant">Disabled</span>
                  )}
                </p>
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20">
                <span className="text-label-xs font-mono uppercase text-on-surface-variant">Link Status</span>
                <p className="text-label-md font-semibold mt-1">
                  {data.maxDownloads !== null && data.downloadCount >= data.maxDownloads ? (
                    <span className="text-error flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">local_fire_department</span> Burned
                    </span>
                  ) : data.expiresAt && new Date() > new Date(data.expiresAt) ? (
                    <span className="text-error flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">timer_off</span> Expired
                    </span>
                  ) : (
                    <span className="text-tertiary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span> Active
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Access Logs */}
            <div>
              <h4 className="text-label-md font-mono font-semibold uppercase text-on-surface-variant mb-2">
                Recent Access Activity ({data.accessLogs.length})
              </h4>
              {data.accessLogs.length === 0 ? (
                <div className="p-4 text-center text-body-sm text-on-surface-variant bg-surface-container-low rounded-xl">
                  No access logs recorded yet.
                </div>
              ) : (
                <div className="border border-outline-variant/20 rounded-xl overflow-hidden text-body-xs font-mono">
                  <div className="bg-surface-container-low px-3 py-2 grid grid-cols-12 text-on-surface-variant font-semibold">
                    <span className="col-span-3">Type</span>
                    <span className="col-span-4">IP Address</span>
                    <span className="col-span-5 text-right">Timestamp</span>
                  </div>
                  <div className="divide-y divide-outline-variant/10 max-h-48 overflow-y-auto">
                    {data.accessLogs.map((log) => (
                      <div key={log.id} className="px-3 py-2 grid grid-cols-12 items-center hover:bg-surface-container/50">
                        <span className="col-span-3 font-bold">
                          {log.accessType === 'BURN' ? (
                            <span className="text-error flex items-center gap-0.5">🔥 BURN</span>
                          ) : log.accessType === 'DOWNLOAD' ? (
                            <span className="text-secondary flex items-center gap-0.5">📥 DOWNLOAD</span>
                          ) : (
                            <span className="text-primary flex items-center gap-0.5">👁️ VIEW</span>
                          )}
                        </span>
                        <span className="col-span-4 text-on-surface truncate">{log.ipAddress || '127.0.0.1'}</span>
                        <span className="col-span-5 text-right text-on-surface-variant">{formatDate(log.accessedAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="pt-4 border-t border-outline-variant/20 mt-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-surface-container text-on-surface font-semibold text-label-md rounded-xl hover:bg-surface-container-high transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
