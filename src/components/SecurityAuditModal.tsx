'use client';

import React, { useEffect, useState } from 'react';

interface SecurityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AuditLogItem {
  id: string;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export default function SecurityAuditModal({ isOpen, onClose }: SecurityAuditModalProps) {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function fetchAuditLogs() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/audit-logs');
        if (!res.ok) {
          throw new Error('Failed to load security audit logs');
        }
        const json = await res.json();
        setLogs(json);
      } catch (err: any) {
        setError(err.message || 'Error loading logs');
      } finally {
        setLoading(false);
      }
    }

    fetchAuditLogs();
  }, [isOpen]);

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

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'LOGIN_SUCCESS':
        return (
          <span className="px-2 py-0.5 rounded-full text-label-xs font-semibold bg-tertiary/10 text-tertiary flex items-center gap-1 w-fit">
            <span className="material-symbols-outlined text-[14px]">verified_user</span> Login Success
          </span>
        );
      case 'LOGIN_FAILED':
        return (
          <span className="px-2 py-0.5 rounded-full text-label-xs font-semibold bg-error/10 text-error flex items-center gap-1 w-fit">
            <span className="material-symbols-outlined text-[14px]">warning</span> Login Failed
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-label-xs font-semibold bg-surface-container text-on-surface-variant flex items-center gap-1 w-fit">
            <span className="material-symbols-outlined text-[14px]">info</span> {action}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl max-h-[85vh] rounded-2xl bg-surface-container-lowest p-6 shadow-xl border border-outline-variant/30 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20 mb-4">
          <div className="flex items-center gap-2 text-primary font-bold text-headline-sm">
            <span className="material-symbols-outlined text-[24px]">shield</span>
            <span>Security & Audit Log</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <p className="text-body-sm text-on-surface-variant mb-4">
          Recent authentication events, active sessions, and security activity for your account.
        </p>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-on-surface-variant gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-body-sm font-mono">Loading audit logs...</span>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-error font-mono text-body-sm">{error}</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-body-sm text-on-surface-variant bg-surface-container-low rounded-xl">
            No audit events recorded yet.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            <div className="border border-outline-variant/20 rounded-xl overflow-hidden text-body-xs font-mono">
              <div className="bg-surface-container-low px-3 py-2 grid grid-cols-12 text-on-surface-variant font-semibold">
                <span className="col-span-4">Event</span>
                <span className="col-span-4">IP Address</span>
                <span className="col-span-4 text-right">Timestamp</span>
              </div>
              <div className="divide-y divide-outline-variant/10 max-h-64 overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="px-3 py-2.5 grid grid-cols-12 items-center hover:bg-surface-container/50">
                    <span className="col-span-4">{getActionBadge(log.action)}</span>
                    <span className="col-span-4 text-on-surface truncate">{log.ipAddress || '127.0.0.1'}</span>
                    <span className="col-span-4 text-right text-on-surface-variant">{formatDate(log.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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
