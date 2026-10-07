const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');

const root = path.join(__dirname, '../src');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const scrollCalls = [];
const ref = { current: { scrollTo: options => scrollCalls.push(options) } };
let lastDependencies;
const react = {
  useRef: () => ref,
  useLayoutEffect(callback, dependencies) {
    if (!lastDependencies || dependencies.some((value, index) => !Object.is(value, lastDependencies[index]))) callback();
    lastDependencies = dependencies;
  }
};
const exportsObject = {};
const code = ts.transpileModule(read('components/WorkspaceScrollArea.tsx'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX }
}).outputText;
vm.runInNewContext(code, {
  exports: exportsObject,
  require(id) { return id === 'react' ? react : require(id); }
});
const ScrollArea = exportsObject.default;
const child = { unsavedForm: 'preserve me' };
const initial = ScrollArea({ children: child, resetKey: 'profile', label: 'Profile content' });
assert.equal(initial.props.children, child, 'Scroll wrapper must not clone or remount its children');
assert.equal(initial.key, null, 'The wrapper must not key/remount forms when a field changes');
assert.equal(initial.props.role, 'region');
assert.equal(initial.props.tabIndex, 0, 'The scroll pane must support keyboard scrolling');
assert.equal(initial.props['aria-label'], 'Profile content');
assert.equal(scrollCalls.length, 1, 'Initial mount resets only this pane');
ScrollArea({ children: child, resetKey: 'profile' });
assert.equal(scrollCalls.length, 1, 'Typing/refetching on the same tab must preserve scroll position');
ScrollArea({ children: child, resetKey: 'attendance' });
assert.equal(scrollCalls.length, 2, 'Tab changes reset the pane before paint');
assert.equal(JSON.stringify(scrollCalls[1]), JSON.stringify({ top: 0, left: 0, behavior: 'instant' }));

const css = read('index.css');
const frame = css.match(/\.workspace-frame\s*\{([^}]+)\}/)[1];
const pane = css.match(/\.workspace-scroll\s*\{([^}]+)\}/)[1];
assert.match(frame, /min-height:\s*0/);
assert.match(frame, /min-width:\s*0/);
assert.match(frame, /overflow:\s*hidden/);
assert.match(pane, /overflow-y:\s*auto/);
assert.match(pane, /scrollbar-gutter:\s*stable/);
assert.match(pane, /overflow-anchor:\s*none/);
assert.match(css, /\.workspace-frame\.ambient-bg\s*\{\s*min-height:\s*0;/, 'Ambient backgrounds must not force a full extra viewport');

const hubs = [
  'modules/eim/EIMManagementHub.tsx',
  'modules/self_service/pages/SSHRHub.tsx',
  'modules/leave_management/pages/LeaveManagementHub.tsx',
  'modules/leave_management/pages/TeamAttendance.tsx',
  'modules/leave_management/pages/ExecutiveRequestCenter.tsx',
  'modules/performance/pages/PerformanceHub.tsx',
  'modules/dashboard/pages/Dashboard.tsx',
  'modules/employee_information/components/AddEmployeeForm.tsx',
  'modules/employee_information/pages/AdvancedEims.tsx'
];
for (const hub of hubs) {
  const source = read(hub);
  assert.match(source, /workspace-frame/, `${hub} needs a bounded frame`);
  assert.match(source, /WorkspaceScrollArea/, `${hub} needs a separate content scroll pane`);
}
const layout = read('components/UnifiedLayout.tsx');
assert.match(layout, /data-testid="workspace-main"/);
assert.match(layout, /h-screen overflow-hidden/);
assert.match(layout, /resetKey=\{currentScreen\}/, 'Remaining modules get the shared scroll fallback');
console.log('PASS: shared workspace scrolling, stable geometry contracts, and preserved form state');
