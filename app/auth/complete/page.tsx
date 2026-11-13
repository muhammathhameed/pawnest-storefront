"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase/browser";
import { safeNextPath } from "../../../lib/auth/redirect";
import { NEXT_COOKIE } from "../../../lib/auth/next-cookie";

/** Finishes sign-in for links that carry tokens in the URL #fragment (implicit flow). */
export default function AuthComplete() {
  const [msg, setMsg] = useState("Finishing sign-in…");
  useEffect(() => {
    (async () => {
      try {
        const sb = getSupabaseBrowserClient();
        // detectSessionInUrl parses #access_token and stores the session cookies.
        const { data } = await sb.auth.getSession();
        if (data.session) {
          const m = document.cookie.match(new RegExp(`(?:^|; )${NEXT_COOKIE}=([^;]*)`));
          document.cookie = `${NEXT_COOKIE}=; Path=/; Max-Age=0`;
          window.location.replace(safeNextPath(m ? decodeURIComponent(m[1]) : null));
          return;
        }
      } catch {}
      const url = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const err = url.get("error_description") ?? "Sign-in link is invalid or expired.";
      window.location.replace(`/login?error=${encodeURIComponent(err)}`);
    })();
  }, []);
  return <main className="grid min-h-screen place-items-center"><p role="status" className="t-body">{msg}</p></main>;
}
