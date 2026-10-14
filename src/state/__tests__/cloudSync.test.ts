jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { ClaudeRuntime, startCloudSync, SyncStatus } from '../cloudSync';
import { emptyState, PersistedState } from '../store';

/** an in-memory stand-in for the artifact db: one doc, one listener */
function fakeRuntime(uid: string | null = 'u_test') {
  let listener: ((s: unknown) => void) | null = null;
  const writes: Record<string, unknown>[] = [];
  const ref = {
    set: jest.fn(async (body: Record<string, unknown>) => {
      writes.push(body);
    }),
    onSnapshot: (next: (s: unknown) => void) => {
      listener = next;
      return () => {
        listener = null;
      };
    },
  };
  const rt = {
    use: async (name: string) => (name === 'db' ? { doc: () => ref } : { id: async () => uid }),
  } as unknown as ClaudeRuntime;
  const emit = (state: PersistedState | null, fromCache = false) =>
    listener?.({
      exists: !!state,
      data: () => (state ? { blob: JSON.stringify(state), updatedAt: state.updatedAt } : undefined),
      metadata: { fromCache },
    });
  return { rt, emit, writes, ref };
}

function save(updatedAt: number, capital: number): PersistedState {
  return { ...emptyState(), updatedAt, capital };
}

const tick = (ms = 0) => jest.advanceTimersByTimeAsync(ms);

describe('cloudSync', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('stays dormant outside the artifact (no runtime): local only, never writes', async () => {
    const statuses: SyncStatus[] = [];
    const sync = startCloudSync({ onStatus: (s) => statuses.push(s), onRemote: jest.fn() }, null);
    await expect(sync.initial).resolves.toBeNull();
    sync.push(save(5, 1));
    expect(statuses).toEqual(['local']);
  });

  it('ignores cached snapshots and resolves initial with the server-confirmed cloud save', async () => {
    const f = fakeRuntime();
    const sync = startCloudSync({ onStatus: jest.fn(), onRemote: jest.fn() }, f.rt);
    await tick();
    f.emit(save(1, 1), true); // stale cache: must not count as the cloud's answer
    f.emit(save(100, 42));
    const initial = await sync.initial;
    expect(initial?.capital).toBe(42);
    expect(initial?.updatedAt).toBe(100);
    sync.stop();
  });

  it('never pushes before a server-confirmed read, so a stale device cannot clobber the cloud', async () => {
    const f = fakeRuntime();
    const sync = startCloudSync({ onStatus: jest.fn(), onRemote: jest.fn() }, f.rt);
    await tick();
    sync.push(save(50, 7));
    await tick(5000);
    expect(f.writes).toHaveLength(0);
    // the cloud turns out to hold a newer action: the older local save is never written
    f.emit(save(80, 9));
    await tick(5000);
    expect(f.writes).toHaveLength(0);
    sync.stop();
  });

  it('pushes a newer player action once (debounced) after the cloud answers', async () => {
    const f = fakeRuntime();
    const sync = startCloudSync({ onStatus: jest.fn(), onRemote: jest.fn() }, f.rt);
    await tick();
    f.emit(null); // brand-new cloud: nothing saved yet
    await sync.initial;
    sync.push(save(10, 1));
    sync.push(save(11, 2));
    sync.push(save(12, 3));
    await tick(2000);
    expect(f.writes).toHaveLength(1);
    expect(JSON.parse(f.writes[0].blob as string).capital).toBe(3);
    expect(f.writes[0].updatedAt).toBe(12);
    // re-offering the same save (e.g. after a re-render) writes nothing new
    sync.push(save(12, 3));
    await tick(2000);
    expect(f.writes).toHaveLength(1);
    sync.stop();
  });

  it('hands later changes from another device to onRemote', async () => {
    const f = fakeRuntime();
    const onRemote = jest.fn();
    const sync = startCloudSync({ onStatus: jest.fn(), onRemote }, f.rt);
    await tick();
    f.emit(save(10, 1));
    await sync.initial;
    f.emit(save(20, 5)); // the phone made a move
    expect(onRemote).toHaveBeenCalledTimes(1);
    expect(onRemote.mock.calls[0][0].capital).toBe(5);
    sync.stop();
  });

  it('if the cloud answers after the startup timeout, the answer still arrives via onRemote', async () => {
    const f = fakeRuntime();
    const onRemote = jest.fn();
    const sync = startCloudSync({ onStatus: jest.fn(), onRemote }, f.rt);
    await tick(7000);
    await expect(sync.initial).resolves.toBeNull();
    f.emit(save(30, 8));
    expect(onRemote).toHaveBeenCalledTimes(1);
    sync.stop();
  });

  it('a signed-out viewer (no id) falls back to local-only', async () => {
    const f = fakeRuntime(null);
    const statuses: SyncStatus[] = [];
    const sync = startCloudSync({ onStatus: (s) => statuses.push(s), onRemote: jest.fn() }, f.rt);
    await expect(sync.initial).resolves.toBeNull();
    expect(statuses[statuses.length - 1]).toBe('local');
    sync.stop();
  });
});
