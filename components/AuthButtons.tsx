'use client'

import { createClient } from '@/utils/supabase/client'

export function AuthButtons() {
  const supabase = createClient()

  const handleSocialLogin = async (provider: 'google' | 'azure') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm mx-auto">
      <button
        onClick={() => handleSocialLogin('google')}
        className="w-full py-3 px-4 rounded-xl font-medium text-white bg-neutral-900 hover:bg-neutral-800 transition flex items-center justify-center gap-3 border border-neutral-700 shadow-lg"
      >
        Continue with Google
      </button>

      <button
        onClick={() => handleSocialLogin('azure')}
        className="w-full py-3 px-4 rounded-xl font-medium text-white bg-neutral-900 hover:bg-neutral-800 transition flex items-center justify-center gap-3 border border-neutral-700 shadow-lg"
      >
        Continue with Microsoft
      </button>
    </div>
  )
}
