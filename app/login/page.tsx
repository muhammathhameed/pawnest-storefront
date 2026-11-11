'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const supabase = createClient();

  const handleLogin = async (provider: 'google' | 'azure') => {
    setLoading(provider);
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 space-y-6 shadow-2xl">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Sign In to AuraFinds</h1>
          <p className="text-sm text-neutral-400">Select an identity provider to continue</p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-950/50 border border-red-800 rounded-xl text-red-300 text-sm">
            {errorMessage}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => handleLogin('google')}
            disabled={loading !== null}
            className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 transition rounded-xl font-medium flex items-center justify-center gap-2 border border-neutral-700 disabled:opacity-50"
          >
            {loading === 'google' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue with Google'}
          </button>
          <button
            onClick={() => handleLogin('azure')}
            disabled={loading !== null}
            className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 transition rounded-xl font-medium flex items-center justify-center gap-2 border border-neutral-700 disabled:opacity-50"
          >
            {loading === 'azure' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue with Microsoft'}
          </button>
        </div>
      </div>
    </main>
  );
}
