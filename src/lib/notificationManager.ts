import { getSubscriber } from "./pgSubscriber";

type Waiter = {
  resolve: () => void;
};

const waiters = new Map<string, Waiter[]>();

let initialized = false;

/**
 * Initialize the notification manager.
 * Must be called once before any waitForNotification calls.
 */
export async function initNotificationManager(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const subscriber = await getSubscriber();

  subscriber.notifications.on("printi_messages", (payload: unknown) => {
    const printerName = payload as string;
    const printerWaiters = waiters.get(printerName);
    if (printerWaiters && printerWaiters.length > 0) {
      // Wake up ALL waiters for this printer (they will compete via SKIP LOCKED)
      for (const w of printerWaiters) {
        w.resolve();
      }
      // Clear the list
      waiters.delete(printerName);
    }
  });
}

/**
 * Wait for a notification for the given printer name.
 * Returns a promise that resolves when a notification arrives.
 * The caller should use an AbortSignal to cancel if the client disconnects.
 */
export function waitForNotification(
  printerName: string,
  signal: AbortSignal
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // If already aborted, reject immediately
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const waiter: Waiter = { resolve };

    if (!waiters.has(printerName)) {
      waiters.set(printerName, []);
    }
    waiters.get(printerName)!.push(waiter);

    // Clean up on abort
    const onAbort = () => {
      const list = waiters.get(printerName);
      if (list) {
        const idx = list.indexOf(waiter);
        if (idx !== -1) list.splice(idx, 1);
        if (list.length === 0) waiters.delete(printerName);
      }
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal.addEventListener("abort", onAbort, { once: true });
  });
}
