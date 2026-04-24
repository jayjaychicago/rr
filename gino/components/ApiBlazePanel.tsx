"use client";

import { useState } from "react";
import { COOKIE_NAME, type ApiBlazeConfig, type CustomHeader } from "@/lib/apiblaze";

function saveConfig(config: ApiBlazeConfig) {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(config))}; path=/; max-age=86400; SameSite=Lax`;
}

function HeadersTable({
  headers,
  onChange,
}: {
  headers: CustomHeader[];
  onChange: (h: CustomHeader[]) => void;
}) {
  const [newHeader, setNewHeader] = useState<CustomHeader>({ name: "", value: "" });

  function add() {
    if (!newHeader.name.trim()) return;
    onChange([...headers, { ...newHeader }]);
    setNewHeader({ name: "", value: "" });
  }

  function remove(i: number) {
    onChange(headers.filter((_, idx) => idx !== i));
  }

  function update(i: number, field: keyof CustomHeader, val: string) {
    onChange(headers.map((h, idx) => (idx === i ? { ...h, [field]: val } : h)));
  }

  return (
    <div>
      {headers.length > 0 && (
        <div className="mb-4 rounded-lg border border-stone-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-medium text-stone-500 w-2/5">Name</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-stone-500">Value</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {headers.map((h, i) => (
                <tr key={i} className="border-t border-stone-50">
                  <td className="px-3 py-1.5">
                    <input
                      type="text" value={h.name}
                      onChange={(e) => update(i, "name", e.target.value)}
                      className="w-full font-mono text-xs focus:outline-none bg-transparent placeholder:text-stone-300"
                      placeholder="Header-Name"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="text" value={h.value}
                      onChange={(e) => update(i, "value", e.target.value)}
                      className="w-full font-mono text-xs focus:outline-none bg-transparent placeholder:text-stone-300"
                      placeholder="value"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button onClick={() => remove(i)} className="text-stone-300 hover:text-red-400 transition-colors text-sm leading-none">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text" value={newHeader.name}
          onChange={(e) => setNewHeader((h) => ({ ...h, name: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Header-Name"
          className="flex-1 font-mono text-xs border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400 bg-stone-50"
        />
        <input
          type="text" value={newHeader.value}
          onChange={(e) => setNewHeader((h) => ({ ...h, value: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="value"
          className="flex-1 font-mono text-xs border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400 bg-stone-50"
        />
        <button onClick={add} className="px-4 py-2 bg-stone-800 text-white text-xs rounded-lg hover:bg-stone-700 transition-colors font-medium">
          Add
        </button>
      </div>
    </div>
  );
}

function BackendSection({
  title,
  badge,
  originalUrl,
  proxyUrl,
  backend,
  authMode,
  apiKey,
  customHeaders,
  radioGroup,
  onBackend,
  onAuthMode,
  onApiKey,
  onHeaders,
}: {
  title: string;
  badge: string;
  originalUrl: string;
  proxyUrl: string;
  backend: "original" | "proxy";
  authMode: "apikey" | "oauth" | "passthru";
  apiKey: string;
  customHeaders: CustomHeader[];
  radioGroup: string;
  onBackend: (v: "original" | "proxy") => void;
  onAuthMode: (v: "apikey" | "oauth" | "passthru") => void;
  onApiKey: (v: string) => void;
  onHeaders: (v: CustomHeader[]) => void;
}) {
  const activeBase = backend === "proxy" ? proxyUrl : originalUrl;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono font-bold tracking-widest bg-stone-100 text-stone-600 px-2 py-0.5 rounded uppercase">{badge}</span>
        <h2 className="text-sm font-semibold font-mono text-stone-700">{title}</h2>
      </div>
      <p className="text-xs font-mono text-stone-400">
        Active: <span className="text-stone-700 break-all">{activeBase}</span>
      </p>

      <section className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">Backend</h3>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="radio" name={`${radioGroup}-backend`} className="mt-1 accent-stone-700"
              checked={backend === "original"} onChange={() => onBackend("original")} />
            <div>
              <div className="font-medium text-stone-900 text-sm">Original</div>
              <div className="text-xs font-mono text-stone-400 mt-0.5">{originalUrl}</div>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="radio" name={`${radioGroup}-backend`} className="mt-1 accent-stone-700"
              checked={backend === "proxy"} onChange={() => onBackend("proxy")} />
            <div>
              <div className="font-medium text-stone-900 text-sm">APIblaze Proxy</div>
              <div className="text-xs font-mono text-stone-400 mt-0.5">{proxyUrl}</div>
            </div>
          </label>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">Authorization</h3>
        <div className="space-y-3 mb-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="radio" name={`${radioGroup}-auth`} className="mt-1 accent-stone-700"
              checked={authMode === "apikey"} onChange={() => onAuthMode("apikey")} />
            <div>
              <div className="font-medium text-stone-900 text-sm">API Key</div>
              <div className="text-xs text-stone-400 mt-0.5">Sends <code className="bg-stone-100 px-1 rounded">x-api-key</code> header</div>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="radio" name={`${radioGroup}-auth`} className="mt-1 accent-stone-700"
              checked={authMode === "oauth"} onChange={() => onAuthMode("oauth")} />
            <div>
              <div className="font-medium text-stone-900 text-sm">OAuth Token</div>
              <div className="text-xs text-stone-400 mt-0.5">Forwards <code className="bg-stone-100 px-1 rounded">access_token</code> as <code className="bg-stone-100 px-1 rounded">Authorization: Bearer</code></div>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="radio" name={`${radioGroup}-auth`} className="mt-1 accent-stone-700"
              checked={authMode === "passthru"} onChange={() => onAuthMode("passthru")} />
            <div>
              <div className="font-medium text-stone-900 text-sm">Passthru</div>
              <div className="text-xs text-stone-400 mt-0.5">No authorization header</div>
            </div>
          </label>
        </div>
        {authMode === "apikey" && (
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">API Key</label>
            <input
              type="text" value={apiKey} onChange={(e) => onApiKey(e.target.value)}
              className="w-full font-mono text-xs border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400 bg-stone-50"
              spellCheck={false} autoComplete="off"
            />
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">Custom Headers</h3>
        <HeadersTable headers={customHeaders} onChange={onHeaders} />
      </section>
    </div>
  );
}

export function ApiBlazePanel({
  config: initial,
  originalUrl,
  proxyUrl,
  ownOriginalUrl,
  ownProxyUrl,
  appName,
}: {
  config: ApiBlazeConfig;
  originalUrl: string;
  proxyUrl: string;
  ownOriginalUrl: string;
  ownProxyUrl: string;
  appName: string;
}) {
  const [config, setConfig] = useState<ApiBlazeConfig>(initial);
  const [saved, setSaved] = useState(false);

  function patch(p: Partial<ApiBlazeConfig>) {
    setConfig((c) => ({ ...c, ...p }));
    setSaved(false);
  }

  function apply() {
    saveConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="min-h-screen bg-stone-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">

        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold tracking-widest bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase">Dev Tool</span>
            <span className="text-[10px] font-mono text-stone-400">{appName}</span>
          </div>
          <h1 className="text-2xl font-bold font-mono tracking-tight">APIblaze Control Panel</h1>
        </div>

        <BackendSection
          title="Resiresi Backend"
          badge="Reservations"
          originalUrl={originalUrl}
          proxyUrl={proxyUrl}
          backend={config.backend}
          authMode={config.authMode}
          apiKey={config.apiKey}
          customHeaders={config.customHeaders}
          radioGroup="resiresi"
          onBackend={(v) => patch({ backend: v })}
          onAuthMode={(v) => patch({ authMode: v })}
          onApiKey={(v) => patch({ apiKey: v })}
          onHeaders={(v) => patch({ customHeaders: v })}
        />

        <div className="border-t border-dashed border-stone-300" />

        <BackendSection
          title="Restaurant Backend"
          badge="Profile"
          originalUrl={ownOriginalUrl}
          proxyUrl={ownProxyUrl}
          backend={config.ownBackend}
          authMode={config.ownAuthMode}
          apiKey={config.ownApiKey}
          customHeaders={config.ownCustomHeaders}
          radioGroup="own"
          onBackend={(v) => patch({ ownBackend: v })}
          onAuthMode={(v) => patch({ ownAuthMode: v })}
          onApiKey={(v) => patch({ ownApiKey: v })}
          onHeaders={(v) => patch({ ownCustomHeaders: v })}
        />

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-stone-400">Saved to cookie · applied to all backend requests for 24 h</p>
          <button
            onClick={apply}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              saved ? "bg-green-600 text-white scale-95" : "bg-stone-900 text-white hover:bg-stone-700"
            }`}
          >
            {saved ? "✓ Applied" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
