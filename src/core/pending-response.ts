import type { Session } from '../types.js';

export const COMPLETED_REACTION_EMOJI_TYPE = 'Done';

type PendingResponseSession = Pick<Session, 'pendingResponseCardId' | 'pendingResponseCardState' | 'lastPatchedResponseCardId'>;

export function isPendingResponseCardOpen(session: Pick<Session, 'pendingResponseCardId' | 'pendingResponseCardState'>): boolean {
  return !!session.pendingResponseCardId && session.pendingResponseCardState === 'open';
}

/** Sync only the cross-process pending-response fields from a fresher Session. */
export function syncPendingResponseState(target: PendingResponseSession, source: PendingResponseSession | undefined): void {
  if (!source) return;
  target.pendingResponseCardId = source.pendingResponseCardId;
  target.pendingResponseCardState = source.pendingResponseCardState;
  target.lastPatchedResponseCardId = source.lastPatchedResponseCardId;
}

export function shouldUseCardForSend(opts: {
  forceCard: boolean;
  forceText: boolean;
  hasMarkdown: boolean;
  hasOpenPendingResponseCard: boolean;
}): boolean {
  if (opts.hasOpenPendingResponseCard) return true;
  return opts.forceCard || (!opts.forceText && opts.hasMarkdown);
}

/** A patch marker means "PATCH was in flight" only for that exact pending card. */
export function shouldTreatPendingCardAsPatchedByMarker(
  pendingCardId: string | undefined,
  marker: { cardId?: string } | undefined,
): boolean {
  return !!pendingCardId && marker?.cardId === pendingCardId;
}

export function createPendingResponseQueue() {
  const tails = new Map<string, Promise<unknown>>();
  return {
    run<T>(key: string, work: () => Promise<T>): Promise<T> {
      const prev = tails.get(key);
      const next = prev ? prev.catch(() => undefined).then(work) : work();
      tails.set(key, next.finally(() => {
        if (tails.get(key) === next) tails.delete(key);
      }));
      return next;
    },
  };
}

export function startPendingResponseTurn(session: PendingResponseSession, messageId: string): void {
  session.pendingResponseCardId = messageId;
  session.pendingResponseCardState = 'open';
}

/** Mark the current open placeholder as patched; keep its id for diagnostics. */
export function markPendingResponseCardPatched(session: PendingResponseSession): void {
  session.lastPatchedResponseCardId = session.pendingResponseCardId;
  session.pendingResponseCardId = undefined;
  session.pendingResponseCardState = 'patched';
}

/** Read the open placeholder id without claiming it until PATCH succeeds. */
export function claimPendingResponseCard(session: PendingResponseSession): string | undefined {
  return isPendingResponseCardOpen(session) ? session.pendingResponseCardId : undefined;
}
