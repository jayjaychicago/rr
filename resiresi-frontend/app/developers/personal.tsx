"use client";

import { useEffect, useState } from "react";

/**
 * Every visitor gets their own proxy name: the docs are rendered with the
 * marker `resiresi0000`, and on the client we swap it for a per-browser name
 * (`resiresi` + 4 random chars, persisted in localStorage) so two readers
 * following the same page never fight over one global proxy name. Names are
 * lowercase alphanumeric only — that's what `apiblaze create` accepts.
 */
const MARKER = /resiresi0000/g;
const KEY = "abz_demo_proxy_name";

function generateName(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `resiresi${suffix}`;
}

export function usePersonalProxyName(): string {
  // Render the marker until mounted so server and client HTML agree.
  const [name, setName] = useState("resiresi0000");
  useEffect(() => {
    try {
      let n = window.localStorage.getItem(KEY);
      if (!n || !/^[a-z0-9]{3,}$/.test(n)) {
        n = generateName();
        window.localStorage.setItem(KEY, n);
      }
      setName(n);
    } catch {
      setName(generateName());
    }
  }, []);
  return name;
}

/** Inline mention of the visitor's proxy name. */
export function ProxyName() {
  const name = usePersonalProxyName();
  return <span className="font-mono text-xs">{name}</span>;
}

/** Code box that personalizes the proxy-name marker in both label and body. */
export function Code({ label, children }: { label?: string; children: string }) {
  const name = usePersonalProxyName();
  const body = children.replace(MARKER, name);
  const head = label?.replace(MARKER, name);
  return (
    <div className="mt-3">
      {head && (
        <div className="rounded-t-lg border-b border-slate-700 bg-slate-800 px-4 py-1.5 font-mono text-[11px] text-slate-300">
          {head}
        </div>
      )}
      <pre
        className={`overflow-x-auto bg-slate-900 px-4 py-3 text-xs leading-relaxed text-slate-100 ${
          head ? "rounded-b-lg" : "rounded-lg"
        }`}
      >
        <code>{body}</code>
      </pre>
    </div>
  );
}
