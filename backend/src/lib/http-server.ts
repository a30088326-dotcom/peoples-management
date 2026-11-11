import type { IncomingMessage, Server, ServerResponse } from 'node:http';

// Keep target connections open longer than the ALB's default 60-second idle timeout.
export function configureHttpServer(server: Server): void {
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 70_000;
}

type Signal = 'SIGTERM' | 'SIGINT';
interface SignalSource {
  on(signal: Signal, listener: () => void): unknown;
  off(signal: Signal, listener: () => void): unknown;
}
interface ShutdownOptions {
  signals?: SignalSource;
  onExit?: (code: number) => void;
  timeoutMs?: number;
}

// ECS normally allows 30 seconds between SIGTERM and SIGKILL. Finish HTTP work
// within that window, including writes already accepted by an API route.
export function installGracefulShutdown(server: Server, options: ShutdownOptions = {}): void {
  const signals = options.signals ?? process;
  const onExit = options.onExit ?? ((code: number) => process.exit(code));
  const timeoutMs = options.timeoutMs ?? 25_000;
  let stopping = false;
  let finished = false;
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const finish = (code: number) => {
    if (finished) return;
    finished = true;
    if (timer) clearTimeout(timer);
    server.off('request', drainCompletedResponse);
    signals.off('SIGTERM', stop);
    signals.off('SIGINT', stop);
    onExit(code);
  };
  const drainCompletedResponse = (_request: IncomingMessage, response: ServerResponse) => {
    response.once('finish', () => {
      // A connection that was active at close() can become idle afterwards.
      // Wait for Node to finish the response before asking it to close idle sockets.
      if (stopping && !finished) setImmediate(() => server.closeIdleConnections());
    });
  };
  const stop = () => {
    if (stopping) return;
    stopping = true;
    timer = setTimeout(() => {
      timedOut = true;
      server.closeAllConnections();
      finish(1);
    }, timeoutMs);
    // Stop accepting new traffic; Node 22 closes idle keep-alive sockets while
    // allowing active requests to finish. Never force-close during the drain.
    server.close(error => finish(error || timedOut ? 1 : 0));
  };

  signals.on('SIGTERM', stop);
  signals.on('SIGINT', stop);
  server.on('request', drainCompletedResponse);
}
