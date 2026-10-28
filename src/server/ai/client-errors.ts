import "server-only";

// Browser-side errors reported by the preview bridge, kept in memory per project so
// the agent's read_console_logs tool and "Try to fix" can see them.
export interface ClientError { kind: string; message: string; at: number }

type G = typeof globalThis & { __doableClientErrors?: Map<string, ClientError[]> };
const g = globalThis as G;
const store: Map<string, ClientError[]> = g.__doableClientErrors ?? (g.__doableClientErrors = new Map());

export function addClientErrors(projectId: string, errors: { kind: string; message: string }[]) {
  const list = store.get(projectId) ?? [];
  for (const e of errors) list.push({ kind: e.kind, message: e.message.slice(0, 4000), at: Date.now() });
  store.set(projectId, list.slice(-30));
}

export function getClientErrors(projectId: string) {
  return store.get(projectId) ?? [];
}

export function clearClientErrors(projectId: string) {
  store.delete(projectId);
}
