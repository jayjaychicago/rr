"use client";

import { useState } from "react";

export function ApiBlazeLogin() {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw === "qpzm123") {
      document.cookie = "apiblaze-auth=qpzm123; path=/; max-age=604800; SameSite=Lax";
      window.location.reload();
    } else {
      setError(true);
      setPw("");
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-xs">
        <div className="text-center mb-6">
          <span className="text-[10px] font-mono font-bold tracking-widest bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase">
            Dev Tool
          </span>
          <h1 className="text-xl font-bold font-mono mt-2">APIblaze Panel</h1>
        </div>
        <form onSubmit={submit} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">Password</label>
            <input
              type="password"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setError(false); }}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              autoFocus
            />
            {error && <p className="text-xs text-red-500 mt-1">Incorrect password</p>}
          </div>
          <button
            type="submit"
            className="w-full bg-stone-900 text-white text-sm font-semibold py-2 rounded-lg hover:bg-stone-700 transition-colors"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
