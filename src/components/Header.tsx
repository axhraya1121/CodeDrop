'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import SecurityAuditModal from '@/components/SecurityAuditModal';

export default function Header({ username = 'User' }: { username?: string }) {
  const router = useRouter();
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem('codedrop_active_session');
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (err) {
      console.error('Logout failed', err);
      sessionStorage.removeItem('codedrop_active_session');
      router.push('/');
    }
  };

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-surface/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-outline-variant/30 dark:border-slate-800">
        <div className="h-16 max-w-5xl mx-auto px-4 md:px-8 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-container-low dark:bg-slate-800 flex items-center justify-center shadow-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 12L12 22L22 12L12 2Z" fill="#00685f" />
              </svg>
            </div>
            <span className="text-headline-sm text-on-surface dark:text-slate-100 tracking-tight font-jakarta font-bold">CodeDrop</span>
          </Link>

          <div className="flex items-center gap-2.5 md:gap-3">
            <Link
              href="/p2p"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary/10 text-primary dark:text-primary-fixed-dim border border-primary/20 text-body-sm font-semibold hover:bg-primary/20 transition-all"
              title="Direct P2P Browser-to-Browser Transfer (Unlimited Size)"
            >
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              <span className="hidden sm:inline">P2P Transfer</span>
            </Link>

            <button
              onClick={() => setShowAuditLogs(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-container dark:bg-slate-800 border border-outline-variant/30 text-body-sm font-medium text-on-surface hover:border-primary transition-all"
              title="View Security & Session Audit Log"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">shield</span>
              <span className="hidden sm:inline">Security</span>
            </button>

            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-container dark:bg-slate-800 border border-outline-variant/30 dark:border-slate-700">
              <div className="w-2 h-2 rounded-full bg-tertiary"></div>
              <span className="font-mono text-label-md text-on-surface-variant dark:text-slate-300">{username}</span>
            </div>
            
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>

            <ThemeToggle />

            <button 
              onClick={handleLogout}
              className="flex items-center gap-1 text-on-surface-variant dark:text-slate-300 hover:text-error hover:bg-error-container/20 px-2.5 py-1.5 rounded-lg transition-colors text-body-sm"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <SecurityAuditModal
        isOpen={showAuditLogs}
        onClose={() => setShowAuditLogs(false)}
      />
    </>
  );
}
