/**
 * Cross-device save sync. When the game runs as the published claude.ai
 * artifact (the web build), the save blob is mirrored to one private document
 * in the artifact's database — data/users/<viewer id>/save — so the laptop and
 * the phone share one career. Anywhere else (Expo Go, a local web dev server)
 * there is no `window.claude` runtime and this stays dormant: saves remain
 * device-local exactly as before.
 *
 * Conflict rule: a save carries `updatedAt`, stamped only by player actions
 * (never by the background construction clock). The newer `updatedAt` wins.
 * Nothing is pushed until a server-confirmed read has landed, so a device
 * that was offline can't overwrite newer progress with its stale copy.
 */
import { Platform } from 'react-native';
import { hydrate, PersistedState } from './store';

export type SyncStatus = 'local' | 'connecting' | 'synced' | 'saving' | 'error';

interface Snap {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
  metadata: { fromCache: boolean };
}

interface DocRef {
  set(data: Record<string, unknown>): Promise<void>;
  onSnapshot(next: (s: Snap) => void, error?: (e: { code: string }) => void): () => void;
}

/** the slice of the artifact runtime this module touches (injectable for tests) */
export interface ClaudeRuntime {
  use(name: 'db'): Promise<{ doc(path: string): DocRef } | null>;
  use(name: 'user'): Promise<{ id(): Promise<string | null> } | null>;
}

// the store caps one document at 256 KiB; leave headroom for the wrapper fields
const MAX_BLOB_CHARS = 240 * 1024;
const PUSH_DEBOUNCE_MS = 1500;
const INITIAL_TIMEOUT_MS = 6000;

function artifactRuntime(): ClaudeRuntime | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const c = (window as unknown as { claude?: { use?: unknown } }).claude;
  return c && typeof c.use === 'function' ? (c as unknown as ClaudeRuntime) : null;
}

function decode(snap: Snap): PersistedState | null {
  if (!snap.exists) return null;
  const body = snap.data();
  if (!body || typeof body.blob !== 'string') return null;
  try {
    return hydrate(JSON.parse(body.blob));
  } catch {
    return null;
  }
}

async function writeOnce(ref: DocRef, body: Record<string, unknown>): Promise<void> {
  try {
    await ref.set(body);
  } catch (e) {
    // the store asks for exactly one retry, after a short randomized delay, on a transient failure
    if ((e as { code?: string })?.code !== 'unavailable') throw e;
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 1000));
    await ref.set(body);
  }
}

export interface CloudSync {
  /** the cloud save once the first server-confirmed read lands (null: none, not syncing, or timed out) */
  initial: Promise<PersistedState | null>;
  /** offer the latest state; written (debounced) only if it holds a newer player action than the cloud */
  push(state: PersistedState): void;
  stop(): void;
}

export function startCloudSync(
  handlers: { onStatus(s: SyncStatus): void; onRemote(s: PersistedState): void },
  rt: ClaudeRuntime | null = artifactRuntime()
): CloudSync {
  if (!rt) {
    handlers.onStatus('local');
    return { initial: Promise.resolve(null), push() {}, stop() {} };
  }

  handlers.onStatus('connecting');
  let stopped = false;
  let unsub: (() => void) | null = null;
  let ref: DocRef | null = null;
  let confirmed = false; // a server-confirmed read has landed
  let cloudAt = 0; // updatedAt the cloud copy is known to hold
  let pending: PersistedState | null = null;
  let writing = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  let initialSettled = false;
  let resolveInitial!: (s: PersistedState | null) => void;
  const initial = new Promise<PersistedState | null>((r) => (resolveInitial = r));
  const settleInitial = (s: PersistedState | null) => {
    if (initialSettled) return;
    initialSettled = true;
    clearTimeout(initialTimer);
    resolveInitial(s);
  };
  const initialTimer = setTimeout(() => settleInitial(null), INITIAL_TIMEOUT_MS);

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, PUSH_DEBOUNCE_MS);
  };

  const flush = async () => {
    timer = null;
    if (!ref || !confirmed || writing || stopped) return;
    const s = pending;
    if (!s || s.updatedAt <= cloudAt) return;
    const blob = JSON.stringify(s);
    if (blob.length > MAX_BLOB_CHARS) {
      handlers.onStatus('error');
      return;
    }
    writing = true;
    handlers.onStatus('saving');
    try {
      await writeOnce(ref, { blob, updatedAt: s.updatedAt, schema: 1 });
      cloudAt = Math.max(cloudAt, s.updatedAt);
      if (!stopped) handlers.onStatus('synced');
    } catch {
      if (!stopped) handlers.onStatus('error');
    } finally {
      writing = false;
    }
    if (pending && pending.updatedAt > cloudAt) schedule();
  };

  (async () => {
    const [db, user] = await Promise.all([rt.use('db'), rt.use('user')]);
    const uid = user ? await user.id() : null;
    if (stopped) return;
    if (!db || !uid) {
      settleInitial(null);
      handlers.onStatus('local');
      return;
    }
    ref = db.doc(`data/users/${uid}/save`);
    unsub = ref.onSnapshot(
      (snap) => {
        if (stopped || snap.metadata.fromCache) return; // wait for the server-confirmed view
        const remote = decode(snap);
        confirmed = true;
        if (remote) cloudAt = Math.max(cloudAt, remote.updatedAt);
        if (!initialSettled) settleInitial(remote);
        else if (remote) handlers.onRemote(remote);
        if (!writing) handlers.onStatus('synced');
        if (pending && pending.updatedAt > cloudAt) schedule();
      },
      (e) => {
        if (!stopped) handlers.onStatus(e.code === 'revoked' ? 'local' : 'error');
      }
    );
  })().catch(() => {
    settleInitial(null);
    if (!stopped) handlers.onStatus('local');
  });

  return {
    initial,
    push(state) {
      if (stopped || state.updatedAt <= cloudAt) return;
      pending = state;
      schedule();
    },
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      settleInitial(null);
      unsub?.();
    },
  };
}
