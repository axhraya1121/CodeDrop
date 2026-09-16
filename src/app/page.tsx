'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (mode === 'signup' && username.length >= 3 && /^[a-z0-9_]+$/.test(username)) {
      setUsernameStatus('checking');
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/auth/check-username?u=${username}`);
          if (res.ok) {
            const data = await res.json();
            setUsernameStatus(data.available ? 'available' : 'taken');
          } else {
            setUsernameStatus('idle');
          }
        } catch (err) {
          setUsernameStatus('idle');
        }
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setUsernameStatus('idle');
    }
  }, [username, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        sessionStorage.setItem('codedrop_active_session', 'true');
        window.location.href = '/dashboard';
      } else {
        const data = await res.json();
        setError(data.message || 'Authentication failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 relative">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="max-w-md w-full">
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center mb-3.5 shadow-sm">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 12L12 22L22 12L12 2Z" fill="#00685f" />
            </svg>
          </div>
          <h1 className="text-headline-md font-bold text-on-surface flex items-center gap-2">
            CodeDrop
            <span className="bg-surface-container text-primary px-2 py-0.5 rounded-full text-label-sm font-mono">v1.0</span>
          </h1>
          <p className="text-body-sm text-on-surface-variant mt-1">Your files, your login. Nothing else.</p>
        </div>

        {/* Auth Card */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-6 sm:p-8 flex flex-col relative overflow-hidden">
          
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-surface-container rounded-xl mb-6 relative z-10">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`py-2 text-center rounded-lg text-body-md transition-all ${
                mode === 'login' 
                  ? 'font-semibold bg-surface-container-lowest text-on-surface shadow-sm' 
                  : 'font-medium text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); }}
              className={`py-2 text-center rounded-lg text-body-md transition-all ${
                mode === 'signup' 
                  ? 'font-semibold bg-surface-container-lowest text-on-surface shadow-sm' 
                  : 'font-medium text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 relative z-10">
            {/* Username Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-end">
                <label className="font-mono text-label-md text-on-surface-variant">Username</label>
                <span className="text-label-sm text-outline/70">min. 3 chars</span>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">person</span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 bg-surface-container-low rounded-xl text-body-md text-on-surface placeholder:text-outline/70 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-colors"
                  placeholder="Enter username"
                />
              </div>
              {mode === 'signup' && usernameStatus !== 'idle' && (
                <div className="flex items-center gap-1.5 mt-1">
                  {usernameStatus === 'checking' && (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin text-outline">progress_activity</span>
                      <span className="text-label-sm text-outline">Checking...</span>
                    </>
                  )}
                  {usernameStatus === 'available' && (
                    <>
                      <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
                      <span className="text-label-sm text-tertiary">Username available</span>
                    </>
                  )}
                  {usernameStatus === 'taken' && (
                    <>
                      <span className="material-symbols-outlined text-[16px] text-error">cancel</span>
                      <span className="text-label-sm text-error">Username already taken</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-label-md text-on-surface-variant">Password</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">key</span>
                <input
                  type={passwordVisible ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 bg-surface-container-low rounded-xl text-body-md text-on-surface placeholder:text-outline/70 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-colors"
                  placeholder="Enter password"
                />
                <button 
                  type="button" 
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="absolute right-3.5 text-outline hover:text-on-surface transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {passwordVisible ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <div className="text-error text-body-sm bg-error/10 p-2.5 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'signup' && usernameStatus === 'taken')}
              className="w-full h-11 mt-2 bg-primary hover:bg-primary-container text-on-primary font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-sm disabled:opacity-70 disabled:pointer-events-none"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                <>
                  {mode === 'login' ? 'Sign in' : 'Create Account'}
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Footer bar */}
          <div className="bg-surface-container-low/60 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 mt-8 px-6 sm:px-8 py-3.5 rounded-b-2xl flex items-center justify-between border-t border-outline-variant/30">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-tertiary"></div>
              <span className="text-label-sm text-on-surface-variant font-mono">Secure Connection</span>
            </div>
            <div className="flex items-center gap-1.5 text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">lock</span>
              <span className="text-label-sm font-mono">256-bit Encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
