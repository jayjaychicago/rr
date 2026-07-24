// Session state now lives in an httpOnly cookie read server-side (lib/session);
// no client-side auth context is needed.
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
