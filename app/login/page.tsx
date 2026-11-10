'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock, Mail, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!email || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        localStorage.setItem('aurafinds_user', JSON.stringify(data.user));
        localStorage.setItem('aurafinds_token', data.token);
        setSuccessMessage('Successfully signed in! Redirecting to your profile...');
        setTimeout(() => {
          window.location.href = '/profile';
        }, 800);
      } else {
        setErrorMessage(data.error || 'Invalid email or password.');
      }
    } catch (err) {
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialAuth = (provider: 'Google' | 'Microsoft') => {
    setIsLoading(true);
    setTimeout(() => {
      const socialUser = {
        id: Date.now().toString(),
        name: `${provider} User`,
        email: `user@${provider.toLowerCase()}.com`,
        phone: '+1 (555) 019-2834',
        address: '742 Evergreen Terrace, Springfield',
        card: '•••• •••• •••• 4242'
      };
      localStorage.setItem('aurafinds_user', JSON.stringify(socialUser));
      localStorage.setItem('aurafinds_token', `sb-token-${provider.toLowerCase()}`);
      setSuccessMessage(`Successfully signed in with ${provider}! Redirecting...`);
      setTimeout(() => {
        window.location.href = '/profile';
      }, 800);
    }, 1000);
  };

  const handleMagicLink = () => {
    if (!email) {
      setErrorMessage('Please enter your email address above to receive a magic link.');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMessage(`Magic link sent to ${email}! Check your inbox to sign in instantly.`);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex items-center justify-center p-4 sm:p-6 font-sans selection:bg-slate-900 selection:text-white relative">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-slate-300/40 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-200/30 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Back to Shop Link */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-6 transition-colors backdrop-blur-md bg-white/60 px-4 py-2 rounded-full border border-white/80 shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to AuraFinds Storefront
        </Link>

        {/* Apple Liquid Glass Card */}
        <div className="backdrop-blur-[40px] bg-white/80 border border-white/95 rounded-[36px] p-8 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.9)]">
          
          {/* Brand Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-[0_8px_20px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.4)]">
              A
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sign in to AuraFinds</h1>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">Access your profile, saved addresses, and payment cards.</p>
          </div>

          {/* Social Auth Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => handleSocialAuth('Google')}
              className="py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 shadow-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.15C3.15 21.32 7.24 24 12 24z"/>
                <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.18C.43 8.13 0 9.87 0 12s.43 3.87 1.18 5.39l4.09-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.24 0 3.15 2.68 1.18 6.61l4.09 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => handleSocialAuth('Microsoft')}
              className="py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 shadow-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
            >
              <svg className="w-4 h-4" viewBox="0 0 23 23">
                <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              Microsoft
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
            <span className="relative px-3 bg-white/80 text-[10px] font-bold uppercase tracking-widest text-slate-400">or sign in with email</span>
          </div>

          {/* Error / Success Banners */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-white/80 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Password</label>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Password reset link has been dispatched to your email.'); }} className="text-[11px] font-semibold text-slate-600 hover:text-slate-900">
                  Forgot password?
                </a>
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-white/80 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.2)] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="animate-pulse">Signing in...</span>
              ) : (
                'Sign In to Profile'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
            <span className="relative px-3 bg-white/80 text-[10px] font-bold uppercase tracking-widest text-slate-400">or</span>
          </div>

          {/* Magic Link Option */}
          <button
            type="button"
            onClick={handleMagicLink}
            className="w-full py-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200/90 font-semibold rounded-2xl shadow-sm transition-all text-xs flex items-center justify-center gap-2 hover:scale-[1.01]"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-700" /> Email me a magic link
          </button>

          {/* Footer Signup Prompt */}
          <div className="mt-8 text-center pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              New to AuraFinds?{' '}
              <Link href="/signup" className="font-bold text-slate-900 hover:underline">
                Create an account
              </Link>
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
