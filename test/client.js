'use strict';

const timers = require('node:timers/promises');
const metatests = require('metatests');
const { WebSocketServer } = require('ws');
const metautil = require('metautil');
const protocol = require('../lib/protocol.js');
const { Metacom } = require('../lib/client.js');

const { emitWarning } = process;
process.emitWarning = (warning, type, ...args) => {
  if (type === 'ExperimentalWarning') return;
  emitWarning(warning, type, ...args);
  return;
};

const api = {
  test: {
    test: {},
  },
};

const mockServer = new WebSocketServer({ port: 8000 });
mockServer.on('connection', (ws) => {
  ws.on('message', async (raw) => {
    const packet = metautil.jsonParse(raw) || {};
    const parsed = protocol.deserialize(packet);
    if (!parsed) return;
    if (parsed.type !== 'call') return;
    const { id, unit, name } = parsed.data;
    if (unit === 'system' && name === 'introspect') {
      const packet = protocol.serialize('callback', { id, result: api });
      ws.send(JSON.stringify(packet));
      return;
    }
    await timers.setTimeout(100);
    const callback = protocol.serialize('callback', { id, result: { a: 'b' } });
    ws.send(JSON.stringify(callback));
  });
});

metatests.test('sample call test', async (test) => {
  const client = Metacom.create('ws://localhost:8000/');
  await client.opening;
  await client.load('test');
  const { meta, ...result } = await client.api.test.test();
  test.strictEqual(result, { a: 'b' });
  test.equal(meta, undefined);
  client.close();
  mockServer.close();
});
