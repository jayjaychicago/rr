"use client";

import { useState } from "react";
import type { Profile } from "@/lib/api";

export function ProfileForm({ initialData, apiBaseUrl = "" }: { initialData: Profile | null; apiBaseUrl?: string }) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [dietaryNotes, setDietaryNotes] = useState(initialData?.dietary_notes ?? "");
  const [marketingOptIn, setMarketingOptIn] = useState(initialData?.marketing_opt_in ?? false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch(`${apiBaseUrl}/api/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || undefined,
          phone: phone || undefined,
          dietary_notes: dietaryNotes || undefined,
          marketing_opt_in: marketingOptIn,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        setErrorMsg(body.error ?? "Something went wrong.");
        setStatus("error");
        return;
      }
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="label" htmlFor="prof-name">Name</label>
        <input
          id="prof-name" type="text" className="input"
          placeholder="Your full name"
          value={name} onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="prof-phone">
          Phone <span className="text-stone-400 font-normal">(optional)</span>
        </label>
        <input
          id="prof-phone" type="tel" className="input"
          placeholder="+1 (212) 555-0000"
          value={phone} onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="prof-dietary">
          Dietary notes <span className="text-stone-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="prof-dietary" className="input resize-none" rows={3}
          placeholder="Allergies, dietary restrictions, preferences…"
          value={dietaryNotes} onChange={(e) => setDietaryNotes(e.target.value)}
        />
      </div>

      <div className="flex items-start gap-3">
        <input
          id="prof-marketing" type="checkbox"
          className="mt-1 h-4 w-4 rounded border-stone-300 accent-brand-700"
          checked={marketingOptIn}
          onChange={(e) => setMarketingOptIn(e.target.checked)}
        />
        <label htmlFor="prof-marketing" className="text-sm text-stone-600 cursor-pointer">
          Send me special offers and news from Nino&apos;s Pizza
        </label>
      </div>

      {status === "success" && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Profile saved!
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-primary w-full py-3"
      >
        {status === "loading" ? "Saving…" : "Save Profile"}
      </button>
    </form>
  );
}
