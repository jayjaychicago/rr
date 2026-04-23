"use client";

import { useState } from "react";
import { COOKIE_NAME, type ApiBlazeConfig, type CustomHeader } from "@/lib/apiblaze";

function saveConfig(config: ApiBlazeConfig) {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(config))}; path=/; max-age=86400; SameSite=Lax`;
}

export function ApiBlazePanel({
  config: initial,
  originalUrl,
  proxyUrl,
  appName,
}: {
  config: ApiBlazeConfig;
  originalUrl: string;
  proxyUrl: string;
  appName: string;
}) {
  const [config, setConfig] = useState<ApiBlazeConfig>(initial);
  const [saved, setSaved] = useState(false);
  const [newHeader, setNewHeader] = useState<CustomHeader>({ name: "", value: "" });

  function patch(p: Partial<ApiBlazeConfig>) {
    setConfig((c) => ({ ...c, ...p }));
    setSaved(false);
  }

  function apply() {
    saveConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function addHeader() {
    if (!newHeader.name.trim()) return;
    patch({ customHeaders: [...config.customHeaders, { ...newHeader }] });
    setNewHeader({ name: "", value: "" });
  }

  function removeHeader(i: number) {
    patch({ customHeaders: config.customHeaders.filter((_, idx) => idx !== i) });
  }

  function updateHeader(i: number, field: keyof CustomHeader, val: string) {
    const headers = config.customHeaders.map((h, idx) =>
      idx === i ? { ...h, [field]: val } : h
    );
    patch({ customHeaders: headers });
  }

  const activeBase = config.backend === "proxy" ? proxyUrl : originalUrl;

  return (
    <div className="min-h-screen bg-green-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold tracking-widest bg-green-100 text-green-700 px-2 py-0.5 rounded uppercase">
              Dev Tool
            </span>
            <span className="text-[10px] font-mono text-stone-400">{appName}</span>
          </div>
          <h1 className="text-2xl font-bold font-mono tracking-tight">APIblaze Control Panel</h1>
          <p className="text-sm text-stone-500 mt-1 font-mono">
            Active base:{" "}
            <span className="text-stone-800 break-all">{activeBase}</span>
          </p>
        </div>

        {/* Backend */}
        <section className="bg-white rounded-2xl border border-green-100 p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-4">Backend</h2>
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="radio"
                name="backend"
                className="mt-1 accent-green-700"
                checked={config.backend === "original"}
                onChange={() => patch({ backend: "original" })}
              />
              <div>
                <div className="font-medium text-stone-900">Original</div>
                <div className="text-xs font-mono text-stone-400 mt-0.5">{originalUrl}</div>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="radio"
                name="backend"
                className="mt-1 accent-green-700"
                checked={config.backend === "proxy"}
                onChange={() => patch({ backend: "proxy" })}
              />
              <div>
                <div className="font-medium text-stone-900">APIblaze Proxy</div>
                <div className="text-xs font-mono text-stone-400 mt-0.5">{proxyUrl}</div>
              </div>
            </label>
          </div>
        </section>

        {/* Auth */}
        <section className="bg-white rounded-2xl border border-green-100 p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-4">Authorization</h2>
          <div className="space-y-4 mb-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="authMode"
                className="mt-1 accent-green-700"
                checked={config.authMode === "apikey"}
                onChange={() => patch({ authMode: "apikey" })}
              />
              <div>
                <div className="font-medium text-stone-900">API Key</div>
                <div className="text-xs text-stone-400 mt-0.5">
                  Sends <code className="bg-stone-100 px-1 rounded">x-api-key</code> header
                </div>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="authMode"
                className="mt-1 accent-green-700"
                checked={config.authMode === "oauth"}
                onChange={() => patch({ authMode: "oauth" })}
              />
              <div>
                <div className="font-medium text-stone-900">OAuth Token</div>
                <div className="text-xs text-stone-400 mt-0.5">
                  Forwards Google/Facebook{" "}
                  <code className="bg-stone-100 px-1 rounded">access_token</code> as{" "}
                  <code className="bg-stone-100 px-1 rounded">Authorization: Bearer</code>
                </div>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="authMode"
                className="mt-1 accent-green-700"
                checked={config.authMode === "passthru"}
                onChange={() => patch({ authMode: "passthru" })}
              />
              <div>
                <div className="font-medium text-stone-900">Passthru</div>
                <div className="text-xs text-stone-400 mt-0.5">No authorization header</div>
              </div>
            </label>
          </div>

          {config.authMode === "apikey" && (
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">API Key</label>
              <input
                type="text"
                value={config.apiKey}
                onChange={(e) => patch({ apiKey: e.target.value })}
                className="w-full font-mono text-xs border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 bg-stone-50"
                spellCheck={false}
                autoComplete="off"
              />
            </div>
          )}
        </section>

        {/* Custom Headers */}
        <section className="bg-white rounded-2xl border border-green-100 p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-4">
            Custom Headers
          </h2>

          {config.customHeaders.length > 0 && (
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
                  {config.customHeaders.map((h, i) => (
                    <tr key={i} className="border-t border-stone-50">
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={h.name}
                          onChange={(e) => updateHeader(i, "name", e.target.value)}
                          className="w-full font-mono text-xs focus:outline-none bg-transparent placeholder:text-stone-300"
                          placeholder="Header-Name"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={h.value}
                          onChange={(e) => updateHeader(i, "value", e.target.value)}
                          className="w-full font-mono text-xs focus:outline-none bg-transparent placeholder:text-stone-300"
                          placeholder="value"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          onClick={() => removeHeader(i)}
                          className="text-stone-300 hover:text-red-400 transition-colors text-sm leading-none"
                          aria-label="Remove header"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newHeader.name}
              onChange={(e) => setNewHeader((h) => ({ ...h, name: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && addHeader()}
              placeholder="Header-Name"
              className="flex-1 font-mono text-xs border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 bg-stone-50"
            />
            <input
              type="text"
              value={newHeader.value}
              onChange={(e) => setNewHeader((h) => ({ ...h, value: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && addHeader()}
              placeholder="value"
              className="flex-1 font-mono text-xs border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 bg-stone-50"
            />
            <button
              onClick={addHeader}
              className="px-4 py-2 bg-green-800 text-white text-xs rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Add
            </button>
          </div>
        </section>

        {/* Apply */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-stone-400">
            Saved to cookie · applied to all backend requests for 24 h
          </p>
          <button
            onClick={apply}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              saved
                ? "bg-green-600 text-white scale-95"
                : "bg-green-900 text-white hover:bg-green-700"
            }`}
          >
            {saved ? "✓ Applied" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
