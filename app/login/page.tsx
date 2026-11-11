'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock, Mail, ShieldAlert, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const supabase = createClient();

  const handleOAuthLogin = async (provider: 'google' | 'azure') => {
    try {
      setLoadingProvider(provider);
      setErrorMessage(null);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setLoadingProvider(null);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during sign-in.');
      setLoadingProvider(null);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-neutral-400 hover:text-white transition flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Store
          </Link>
          <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-800/50">
            Secure Auth
          </span>
        </div>

        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Sign in to AuraFinds</h1>
          <p className="text-sm text-neutral-400">Choose your preferred enterprise provider</p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-950/50 border border-red-800 rounded-xl text-red-300 text-sm flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => handleOAuthLogin('google')}
            disabled={loadingProvider !== null}
            className="w-full py-3 px-4 rounded-xl font-medium text-white bg-neutral-800 hover:bg-neutral-700 transition flex items-center justify-center gap-3 border border-neutral-700 disabled:opacity-50"
          >
            {loadingProvider === 'google' ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <span>Continue with Google</span>
            )}
          </button>

          <button
            onClick={() => handleOAuthLogin('azure')}
            disabled={loadingProvider !== null}
            className="w-full py-3 px-4 rounded-xl font-medium text-white bg-neutral-800 hover:bg-neutral-700 transition flex items-center justify-center gap-3 border border-neutral-700 disabled:opacity-50"
          >
            {loadingProvider === 'azure' ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <span>Continue with Microsoft (Windows)</span>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
