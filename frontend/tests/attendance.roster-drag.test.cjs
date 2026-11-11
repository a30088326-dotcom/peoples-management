const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');

const slots = [], effects = [], writes = [], closes = [];
let cursor = 0, mounted = false;
const react = {
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
  },
  useRef(initial) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
  useEffect(callback) { if (!mounted) effects.push(callback); }
};
const shifts = [
  { id: 'day', code: '001', name: 'Day shift', startTime: '09:00:00', endTime: '18:00:00', status: 'Active', crossMidnight: false },
  { id: 'night', code: '002', name: 'Night shift', startTime: '21:00:00', endTime: '06:00:00', status: 'Active', crossMidnight: true }
];
const api = {
  getShifts: async () => ({ data: { data: shifts } }),
  updateRosterGroup: async (id, payload) => writes.push({ id, payload }),
  createRosterGroup: async payload => writes.push({ payload })
};
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/modules/attendance/components/RosterGroupModal.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX }
}).outputText;
const output = {};
let hitDate = null, hitOtherForm = false;
const form = {};
const document = { elementFromPoint: () => hitDate ? { closest: () => ({
  disabled: false, dataset: { rosterDate: hitDate }, closest: () => hitOtherForm ? {} : form
}) } : null };
vm.runInNewContext(code, { exports: output, console, document, require(id) {
  if (id === 'react') return react;
  if (id === 'react/jsx-runtime') return require(id);
  if (id === 'lucide-react') return new Proxy({}, { get: () => () => null });
  return { attendanceApi: api };
} });
const group = { id: 'existing-roster', name: 'Existing roster', shifts: [{ id: 'day', isDefault: true }],
  calendarAssignments: [{ date: '2026-09-15', shiftId: 'day', isOffDay: false }] };
let props = { group, onClose: refresh => closes.push(refresh) };
const render = () => { cursor = 0; const tree = output.default(props); mounted = true; return tree; };
const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
const find = (tree, predicate) => nodes(tree).find(predicate);
const id = (tree, value) => find(tree, node => node.props?.id === value);
const card = tree => find(tree, node => node.props?.['data-testid'] === 'roster-shift-drag-card');
const day = (tree, date) => find(tree, node => node.props?.['data-roster-date'] === date);
const change = (tree, value) => id(tree, 'calendar-shift').props.onChange({ target: { value } });
let timestamp = 0;
function dragEvent(clientX = 10, clientY = 10, pointerId = 1) {
  return { pointerId, pointerType: 'mouse', clientX, clientY, timeStamp: timestamp += 100, button: 0, isPrimary: true,
    prevented: false, preventDefault() { this.prevented = true; },
    currentTarget: { closest: () => form, setPointerCapture() {}, hasPointerCapture: () => true, releasePointerCapture() {} } };
}
function beginDrag(tree) {
  const first = dragEvent();
  card(tree).props.onPointerDown(first); card(tree).props.onPointerUp(first);
  card(tree).props.onPointerDown(dragEvent());
}
function dropOn(tree, date) {
  hitDate = date; beginDrag(tree);
  card(tree).props.onPointerMove(dragEvent(50, 50));
  card(tree).props.onPointerUp(dragEvent(50, 50));
}

(async () => {
  render(); effects.forEach(effect => effect()); await new Promise(resolve => setImmediate(resolve));
  let tree = render();
  find(tree, node => node.props?.['aria-label'] === 'Calendar month').props.onChange({ target: { value: '9' } });
  find(tree, node => node.props?.['aria-label'] === 'Calendar year').props.onChange({ target: { value: '2026' } });
  tree = render(); change(tree, 'night'); tree = render();
  assert.ok(card(tree).props.onPointerDown);
  assert.match(card(tree).props['aria-label'], /Night shift/);
  assert.equal(day(tree, '2026-10-04').props.onClick, undefined, 'Clicking a date cannot assign a shift');
  assert.match(day(tree, '2026-10-04').props['aria-label'], /Default shift/, 'Dropdown selection does not assign dates');
  hitDate = '2026-10-04'; card(tree).props.onPointerDown(dragEvent());
  card(tree).props.onPointerMove(dragEvent(12, 12)); card(tree).props.onPointerUp(dragEvent(12, 12)); tree = render();
  assert.match(day(tree, '2026-10-04').props['aria-label'], /Default shift/, 'A tap with small pointer jitter cannot assign a date');
  card(tree).props.onPointerCancel(); beginDrag(tree);
  hitDate = '2026-10-04';
  const hover = dragEvent(50, 50); card(tree).props.onPointerMove(hover); tree = render();
  assert.equal(hover.prevented, true);
  assert.match(day(tree, '2026-10-04').props.className, /ring-indigo-500/);
  assert.ok(find(tree, node => node.props?.['data-testid'] === 'roster-drag-preview'), 'Dragged shift visibly follows the pointer');
  card(tree).props.onPointerUp(hover); tree = render();
  assert.match(day(tree, '2026-10-04').props['aria-label'], /Night shift/);
  assert.doesNotMatch(day(tree, '2026-10-04').props.className, /ring-indigo-500/);
  assert.match(find(tree, node => node.props?.role === 'status').props.children, /Night shift assigned to 2026-10-04/);
  assert.equal(card(tree).props['aria-pressed'], false, 'Successful drop resets the picked-up state');
  change(tree, 'day'); tree = render();
  // Tap-tap-and-hold drags assign, including replacement, off days and reverting to default.
  dropOn(tree, '2026-10-04'); tree = render();
  assert.match(day(tree, '2026-10-04').props['aria-label'], /Day shift/);
  change(tree, 'OFF'); tree = render(); dropOn(tree, '2026-10-05'); tree = render();
  assert.match(day(tree, '2026-10-05').props['aria-label'], /Off day/);
  change(tree, 'CLEAR'); tree = render(); dropOn(tree, '2026-10-04'); tree = render();
  assert.match(day(tree, '2026-10-04').props['aria-label'], /Default shift/);
  // Unstarted, canceled, secondary-pointer and other-calendar drags must not modify dates.
  hitDate = '2026-10-06';
  card(tree).props.onPointerUp(dragEvent(50, 50)); tree = render();
  assert.match(day(tree, '2026-10-06').props['aria-label'], /Default shift/);
  change(tree, 'night'); tree = render(); beginDrag(tree);
  card(tree).props.onPointerCancel(); tree = render(); card(tree).props.onPointerUp(dragEvent(50, 50)); tree = render();
  assert.match(day(tree, '2026-10-06').props['aria-label'], /Default shift/);
  beginDrag(tree); card(tree).props.onPointerMove(dragEvent(50, 50, 2));
  card(tree).props.onPointerUp(dragEvent(50, 50, 2)); tree = render();
  assert.match(day(tree, '2026-10-06').props['aria-label'], /Default shift/);
  card(tree).props.onLostPointerCapture();
  hitOtherForm = true; beginDrag(tree); card(tree).props.onPointerMove(dragEvent(50, 50));
  card(tree).props.onPointerUp(dragEvent(50, 50)); tree = render();
  assert.match(day(tree, '2026-10-06').props['aria-label'], /Default shift/);
  hitOtherForm = false;
  // A click on the card, without a drag, cannot assign a date.
  beginDrag(tree); card(tree).props.onPointerUp(dragEvent()); tree = render();
  assert.match(day(tree, '2026-10-06').props['aria-label'], /Default shift/);
  assert.equal(card(tree).props['aria-pressed'], false, 'Released double-tap does not leave a separate pickup step');
  card(tree).props.onKeyDown({ key: 'Escape' }); tree = render();
  assert.equal(card(tree).props['aria-pressed'], false, 'Escape cancels the pickup');
  beginDrag(tree); change(tree, 'day'); tree = render();
  card(tree).props.onPointerMove(dragEvent(50, 50)); card(tree).props.onPointerUp(dragEvent(50, 50)); tree = render();
  assert.match(day(tree, '2026-10-06').props['aria-label'], /Default shift/, 'Changing the dropdown cancels an old drag');
  change(tree, 'night'); tree = render();
  dropOn(tree, '2026-10-06'); tree = render();
  await id(tree, 'roster-form').props.onSubmit({ preventDefault() {} });
  const saved = writes.at(-1);
  assert.equal(saved.id, group.id);
  assert.equal(saved.payload.calendarAssignments.length, 3, 'Repeated changes to a date produce a single saved mapping');
  assert.equal(saved.payload.calendarAssignments.find(item => item.date === '2026-10-06').shiftId, 'night');
  assert.equal(saved.payload.calendarAssignments.find(item => item.date === '2026-10-05').isOffDay, true);
  assert.equal(saved.payload.calendarAssignments.find(item => item.date === '2026-10-04').clear, true);
  assert.equal(saved.payload.shifts.find(item => item.shiftId === 'day').isDefault, true);
  assert.ok(!saved.payload.calendarAssignments.some(item => item.date === '2026-09-15'), 'Untouched saved dates are not overwritten');
  assert.equal(closes.at(-1), true);
  assert.equal(writes.length, 1, 'Drag preview makes no API writes before Save');
  props = { group: null, onClose: refresh => closes.push(refresh) }; slots.length = 0; effects.length = 0; mounted = false;
  render(); effects.forEach(effect => effect()); await new Promise(resolve => setImmediate(resolve)); tree = render();
  assert.equal(card(tree), undefined, 'No draggable card until a choice is selected');
  id(tree, 'roster-name').props.onChange({ target: { value: 'New roster' } }); change(tree, 'night'); tree = render();
  const date = find(tree, node => node.props?.['data-roster-date']).props['data-roster-date'];
  // A touchpad may expose only the held press, without a browser dblclick event.
  beginDrag(tree); card(tree).props.onPointerUp(dragEvent()); card(tree).props.onLostPointerCapture(); tree = render();
  assert.equal(card(tree).props['aria-pressed'], false);
  timestamp += 5000; hitDate = date; card(tree).props.onPointerDown(dragEvent());
  tree = render(); assert.equal(card(tree).props['aria-pressed'], false, 'Press alone does not activate a green pickup mode');
  card(tree).props.onPointerMove(dragEvent(50, 50)); card(tree).props.onPointerUp(dragEvent(50, 50)); tree = render();
  assert.equal(card(tree).props['aria-pressed'], false);
  await id(tree, 'roster-form').props.onSubmit({ preventDefault() {} });
  assert.equal(writes.at(-1).payload.calendarAssignments[0].shiftId, 'night');
  assert.equal(writes.at(-1).payload.shifts[0].isDefault, true);
  // Chromium native dragging must not cancel the captured pointer gesture.
  slots.length = 0; effects.length = 0; mounted = false;
  render(); effects.forEach(effect => effect()); await new Promise(resolve => setImmediate(resolve)); tree = render();
  id(tree, 'roster-name').props.onChange({ target: { value: 'Pointer drag roster' } }); change(tree, 'night'); tree = render();
  assert.equal(card(tree).props.draggable, false, 'Native drag cannot interrupt pointer capture');
  const blocked = dragEvent(); card(tree).props.onDragStart(blocked);
  assert.equal(blocked.prevented, true, 'Unexpected native drag is blocked');
  const mouseDown = dragEvent(); card(tree).props.onPointerDown(mouseDown);
  assert.equal(mouseDown.prevented, true, 'The held press suppresses browser native drag immediately');
  card(tree).props.onPointerUp(mouseDown); tree = render();
  assert.equal(card(tree).props.onDoubleClick, undefined, 'No dblclick pickup handler is needed');
  // Different coordinates and a slow double-tap still work: there is no timing/distance gate.
  timestamp += 1200;
  const pickedDown = dragEvent(40, 30); card(tree).props.onPointerDown(pickedDown);
  assert.equal(pickedDown.prevented, true, 'Second-tap hold owns the drag without another click');
  hitDate = date; card(tree).props.onPointerMove(dragEvent(50, 50)); tree = render();
  assert.match(day(tree, date).props.className, /ring-indigo-500/);
  card(tree).props.onPointerUp(dragEvent(50, 50)); tree = render();
  assert.match(day(tree, date).props['aria-label'], /Night shift/);
  assert.equal(card(tree).props['aria-pressed'], false);
  // A later pointer-up cannot reuse a completed drag.
  const secondDate = find(tree, node => node.props?.['data-roster-date'] && node.props['data-roster-date'] !== date).props['data-roster-date'];
  hitDate = secondDate; card(tree).props.onPointerUp(dragEvent(50, 50)); tree = render();
  assert.match(day(tree, secondDate).props['aria-label'], /Default shift/);
  await id(tree, 'roster-form').props.onSubmit({ preventDefault() {} });
  assert.equal(writes.at(-1).payload.calendarAssignments.length, 1, 'Completed gestures do not duplicate saved mappings');
  assert.equal(writes.at(-1).payload.calendarAssignments[0].shiftId, 'night');
  // Touch pointers follow the same one-gesture path, including cancel and retry.
  change(tree, 'day'); tree = render();
  const touchDown = { ...dragEvent(), pointerType: 'touch' };
  card(tree).props.onPointerDown(touchDown);
  card(tree).props.onPointerMove({ ...dragEvent(70, 70), pointerType: 'touch' });
  card(tree).props.onPointerCancel(); tree = render();
  assert.equal(card(tree).props['aria-pressed'], false);
  hitDate = secondDate;
  card(tree).props.onPointerDown({ ...dragEvent(), pointerType: 'touch' });
  card(tree).props.onPointerMove({ ...dragEvent(70, 70), pointerType: 'touch' });
  card(tree).props.onPointerUp({ ...dragEvent(70, 70), pointerType: 'touch' }); tree = render();
  assert.match(day(tree, secondDate).props['aria-label'], /Day shift/);
  console.log('PASS: one-gesture touchpad tap-hold-drag without dblclick, slow/moved second taps, direct mouse drag, touch cancel/retry, no pickup mode, jitter/other-calendar guards and create/edit save mappings');
})().catch(error => { console.error(error); process.exitCode = 1; });
