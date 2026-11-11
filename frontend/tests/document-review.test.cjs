const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const sourceRoot = path.join(__dirname, '../src');
const compile = (file, jsx = false) => ts.transpileModule(fs.readFileSync(path.join(sourceRoot, file), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, ...(jsx ? { jsx: ts.JsxEmit.ReactJSX } : {}) }
}).outputText;
const document = (id, status = 'PENDING') => ({ id, status, type: 'NATIONAL_ID', label: 'Fixture document', fileUrl: '/api/files/fixture.png' });
const response = data => ({ data: { success: true, data } });
const failure = (status, message) => ({ response: { status, data: { message } } });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

function harness(initial) {
  const slots = []; let index = 0, selected = initial, latest = [initial], updated = [];
  const calls = { verify: [], list: [], send: [] };
  const api = { verify: async () => response(document(initial.id, 'APPROVED')), list: async () => response(latest), send: async () => response({ delivery: { sent: true } }) };
  const react = {
    useState(value) { const at = index++; if (!(at in slots)) slots[at] = typeof value === 'function' ? value() : value; return [slots[at], next => { slots[at] = typeof next === 'function' ? next(slots[at]) : next; }]; },
    useRef(value) { const at = index++; if (!(at in slots)) slots[at] = { current: value }; return slots[at]; },
    useEffect(callback) { const at = index++; if (!(at in slots)) { slots[at] = true; callback(); } }
  };
  const output = {};
  vm.runInNewContext(compile('modules/onboarding/hooks/useDocumentReview.ts'), { exports: output, require(name) {
    if (name === 'react') return react;
    if (name.endsWith('/api/documents')) return { documentsApi: {
      verify: (...args) => { calls.verify.push(args); return api.verify(...args); },
      list: (...args) => { calls.list.push(args); return api.list(...args); },
      sendReuploadLink: (...args) => { calls.send.push(args); return api.send(...args); }
    } };
    throw new Error('Unexpected dependency: ' + name);
  } });
  return { calls, api, updated, select: value => { selected = value; }, selection: () => selected,
    render() { index = 0; return output.useDocumentReview({ document: selected, candidateId: 'fixture-candidate',
      onUpdated: value => { updated.push(value); if (selected.id === value.id) selected = value; },
      onRefreshed: values => { latest = values; selected = values.find(value => value.id === selected?.id) || values[0] || null; }
    }); }
  };
}

(async () => {
  for (const status of ['APPROVED', 'REJECTED']) {
    const h = harness(document('reviewed', status)); const r = h.render(); r.openReject(); await r.approve(); await r.reject();
    assert.equal(h.calls.verify.length, 0, 'Completed decisions must never issue another review write');
    assert.equal(h.render().rejectOpen, false); assert.match(h.render().error, /already reviewed/);
  }
  {
    const h = harness(document('conflict')); let r = h.render(); r.openReject(); r = h.render(); r.setRejectionNote('Keep this reason'); r = h.render();
    h.api.verify = async () => { throw failure(409, 'Document was already reviewed. Refresh before taking another action.'); };
    h.api.list = async () => response([document('conflict', 'APPROVED')]); await r.reject(); r = h.render();
    assert.equal(h.calls.verify.length, 1); assert.equal(h.calls.list.length, 1); assert.equal(h.selection().status, 'APPROVED');
    assert.equal(r.rejectOpen, false); assert.match(r.error, /already reviewed/); assert.equal(r.notice, '');
  }
  {
    const h = harness(document('retry')); let r = h.render(); r.openReject(); r = h.render(); r.setRejectionNote('Correct the scan'); r = h.render();
    h.api.verify = async () => { throw failure(500, 'Storage unavailable'); }; await r.reject(); r = h.render();
    assert.equal(h.calls.verify.length, 1); assert.equal(h.calls.list.length, 0); assert.equal(r.rejectOpen, true);
    assert.equal(r.rejectionNote, 'Correct the scan'); assert.equal(h.selection().status, 'PENDING'); assert.equal(r.error, 'Storage unavailable');
    h.api.verify = async () => response(document('retry', 'REJECTED')); await r.reject(); r = h.render();
    assert.equal(h.calls.verify.length, 2); assert.equal(h.selection().status, 'REJECTED'); assert.equal(r.rejectOpen, false); assert.equal(r.rejectionNote, '');
  }
  {
    const h = harness(document('read-failure')); let r = h.render(); h.api.verify = async () => { throw failure(409, 'Review conflict'); };
    h.api.list = async () => { throw failure(503, 'Read unavailable'); }; await r.approve(); r = h.render(); assert.equal(r.refreshRequired, true);
    await r.approve(); assert.equal(h.calls.verify.length, 1, 'Conflicted writes stay blocked until a fresh read succeeds');
    h.api.list = async () => response([document('read-failure', 'APPROVED')]); await r.refresh(); r = h.render(); assert.equal(r.refreshRequired, false); assert.equal(r.error, '');
  }
  {
    const h = harness(document('duplicate')); const r = h.render(), pending = deferred(); h.api.verify = () => pending.promise;
    const first = r.approve(), second = r.approve(); assert.equal(h.calls.verify.length, 1);
    pending.resolve(response(document('duplicate', 'APPROVED'))); await Promise.all([first, second]); assert.equal(h.updated.length, 1);
  }
  {
    const h = harness(document('old')); const r = h.render(), pending = deferred(); h.api.verify = () => pending.promise;
    const old = r.approve(); h.select(document('new')); h.render(); pending.resolve(response(document('old', 'APPROVED'))); await old;
    assert.equal(h.selection().id, 'new'); assert.equal(h.updated.length, 0, 'A late response must not replace a different selected document');
  }
  {
    const h = harness(document('email', 'REJECTED')); const r = h.render(); h.api.send = async () => response({ delivery: { sent: false, reason: 'Mail unavailable' } });
    await r.sendReuploadLink(); assert.equal(h.render().error, 'Mail unavailable'); assert.equal(h.render().notice, '');
  }

  {
    const first = document('pending-first');
    const second = document('pending-second');
    const reviewed = [document('already-approved', 'APPROVED'), document('already-rejected', 'REJECTED')];
    const h = harness(reviewed[0]);
    await h.render().approveAll(reviewed);
    assert.equal(h.calls.verify.length, 0, 'An empty pending set makes no requests');

    const inFlight = deferred();
    h.api.verify = async id => id === first.id ? inFlight.promise : response(document(id, 'APPROVED'));
    const docs = [reviewed[0], first, reviewed[1], second];
    const batch = h.render().approveAll(docs);
    assert.equal(h.render().approvingAll, true);
    await h.render().approveAll(docs);
    assert.deepEqual(h.calls.verify.map(args => args.slice(0, 2)), [[first.id, 'APPROVED']]);
    inFlight.resolve(response(document(first.id, 'APPROVED')));
    await batch;
    assert.deepEqual(h.calls.verify.map(args => args.slice(0, 2)), [[first.id, 'APPROVED'], [second.id, 'APPROVED']]);
    assert.deepEqual(h.updated.map(item => item.id), [first.id, second.id]);
    assert.equal(h.selection().id, reviewed[0].id);
    assert.equal(h.render().notice, '2 documents approved.');
    assert.equal(h.render().busy, false);
  }
  {
    const pending = [document('saved'), document('conflict'), document('remaining')];
    const h = harness(pending[0]);
    h.api.verify = async id => {
      if (id === 'conflict') throw failure(409, 'Document was already reviewed.');
      return response(document(id, 'APPROVED'));
    };
    h.api.list = async () => { throw failure(503, 'Read unavailable'); };
    await h.render().approveAll(pending);
    assert.deepEqual(h.calls.verify.map(args => args[0]), ['saved', 'conflict']);
    assert.equal(h.selection().status, 'APPROVED');
    assert.match(h.render().error, /1 of 3 approvals confirmed.*Refresh documents before retrying/);
    assert.equal(h.render().refreshRequired, true);
    await h.render().approveAll(pending);
    assert.equal(h.calls.verify.length, 2);

    const latest = [document('saved', 'APPROVED'), document('conflict', 'REJECTED'), pending[2]];
    h.api.list = async () => response(latest);
    await h.render().refresh();
    assert.equal(h.render().refreshRequired, false);
    await h.render().approveAll(latest);
    assert.deepEqual(h.calls.verify.map(args => args[0]), ['saved', 'conflict', 'remaining']);
    assert.equal(h.render().notice, '1 document approved.');
  }
  {
    const h = harness(document('old-first'));
    const inFlight = deferred();
    h.api.verify = () => inFlight.promise;
    const batch = h.render().approveAll([document('old-first'), document('old-second')]);
    h.select(document('new-selection'));
    h.render();
    inFlight.resolve(response(document('old-first', 'APPROVED')));
    await batch;
    assert.equal(h.calls.verify.length, 1, 'A batch stops sending requests when the active review changes');
    assert.equal(h.updated.length, 0);
  }

  const icons = new Proxy({}, { get: (_, name) => String(name) }); const output = {};
  vm.runInNewContext(compile('modules/onboarding/components/verification/VerificationPreview.tsx', true), { exports: output, require(name) {
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'lucide-react') return icons;
    if (name.endsWith('/ProtectedFile')) return { useProtectedFile: () => ({ url: 'blob:fixture', error: '' }), ProtectedFileLink: 'ProtectedFileLink' };
    if (name === './documentPresentation') return { documentColor: () => '#2563eb', documentIcon: () => 'file', documentLabel: d => d.label };
    throw new Error(name);
  } });
  const buttons = tree => { const result = []; const text = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '';
    function walk(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(walk); if (node.type === 'button') result.push(text(node.props.children)); walk(node.props?.children); } walk(tree); return result;
  };
  const render = status => buttons(output.default({ document: document('fixture', status), busy: false, refreshRequired: false, onApprove() {}, onReject() {}, onSendLink() {} }));
  assert.deepEqual(render('APPROVED'), []); assert.deepEqual(render('REJECTED'), ['Send Re-upload Link']); assert.deepEqual(render('PENDING'), ['Reject', 'Approve Document']);
  console.log('PASS: reviewed-document guards, state-appropriate actions, 409 refresh, blocked retry after failed refresh, 500 reason preservation/manual retry, duplicate writes, stale responses and failed email delivery.');
})().catch(error => { console.error(error); process.exitCode = 1; });
