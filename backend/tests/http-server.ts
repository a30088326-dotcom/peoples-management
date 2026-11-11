import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createServer, request, Agent, type Server, type ServerResponse } from 'node:http';
import { configureHttpServer, installGracefulShutdown } from '../src/lib/http-server';

const listen = (server: Server) => new Promise<number>(resolve => {
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    assert(address && typeof address !== 'string');
    resolve(address.port);
  });
});
function read(port: number, agent?: Agent, method = 'GET') {
  return new Promise<string>((resolve, reject) => {
    const pending = request({ hostname: '127.0.0.1', port, path: '/', agent, method }, response => {
      let text = '';
      response.on('data', data => { text += data; });
      response.on('end', () => resolve(text));
      response.on('error', reject);
    }).on('error', reject);
    pending.end();
  });
}

test('target keep-alive exceeds the default ALB idle timeout without disabling request limits', () => {
  const server = createServer();
  const requestTimeout = server.requestTimeout;
  configureHttpServer(server);
  assert.equal(server.keepAliveTimeout, 65_000);
  assert(server.headersTimeout > server.keepAliveTimeout + 1_000);
  assert.equal(server.requestTimeout, requestTimeout);
  assert(server.requestTimeout > 0);
});

test('SIGTERM drains an accepted write before exiting and repeated signals do not interrupt it', { timeout: 5_000 }, async t => {
  let complete!: ServerResponse;
  let started!: () => void;
  const accepted = new Promise<void>(resolve => { started = resolve; });
  const server = createServer((request, response) => {
    assert.equal(request.method, 'POST');
    complete = response;
    started();
  });
  configureHttpServer(server);
  t.after(() => { server.closeAllConnections(); server.close(); });
  const port = await listen(server);
  const signals = new EventEmitter();
  const exits: number[] = [];
  let finished!: () => void;
  const stopped = new Promise<void>(resolve => { finished = resolve; });
  installGracefulShutdown(server, { signals, onExit: code => { exits.push(code); finished(); } });
  const response = read(port, undefined, 'POST');
  await accepted;
  signals.emit('SIGTERM');
  signals.emit('SIGTERM');
  signals.emit('SIGINT');
  assert.equal(server.listening, false);
  assert.deepEqual(exits, []);
  complete.end('write committed');
  assert.equal(await response, 'write committed');
  await stopped;
  assert.deepEqual(exits, [0]);
  assert.equal(signals.listenerCount('SIGTERM'), 0);
  assert.equal(signals.listenerCount('SIGINT'), 0);
});

test('idle keep-alive connections do not delay shutdown', { timeout: 5_000 }, async t => {
  const server = createServer((_request, response) => response.end('ok'));
  configureHttpServer(server);
  const agent = new Agent({ keepAlive: true });
  t.after(() => { agent.destroy(); server.closeAllConnections(); server.close(); });
  const port = await listen(server);
  assert.equal(await read(port, agent), 'ok');
  const signals = new EventEmitter();
  const stopped = new Promise<number>(resolve => installGracefulShutdown(server, { signals, onExit: resolve }));
  signals.emit('SIGINT');
  assert.equal(await stopped, 0);
});

test('a stuck request is closed at the deadline with one failed exit', { timeout: 5_000 }, async t => {
  let started!: () => void;
  const accepted = new Promise<void>(resolve => { started = resolve; });
  const server = createServer(() => started());
  t.after(() => { server.closeAllConnections(); server.close(); });
  const port = await listen(server);
  const signals = new EventEmitter();
  const exits: number[] = [];
  let finish!: () => void;
  const stopped = new Promise<void>(resolve => { finish = resolve; });
  installGracefulShutdown(server, { signals, timeoutMs: 40, onExit: code => { exits.push(code); finish(); } });
  const response = read(port).then(() => 'unexpected success', error => error.code);
  await accepted;
  signals.emit('SIGTERM');
  await stopped;
  assert.equal(await response, 'ECONNRESET');
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(exits, [1]);
  assert.equal(signals.listenerCount('SIGTERM'), 0);
});
