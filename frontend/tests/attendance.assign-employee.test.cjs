const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');

// Small hook harness exercises the real component without writing employee data.
const slots = [], effects = [];
let cursor = 0, mounted = false;
const react = {
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
  },
  useEffect(callback) { if (!mounted) effects.push(callback); },
  useMemo(callback) { return callback(); }
};
const employees = [
  { id: 'a', employeeNo: '001', personalDetails: { firstName: 'Alpha' }, departmentId: 'd1', department: 'Finance', isActive: true },
  { id: 'b', employeeNo: '002', personalDetails: { firstName: 'Beta' }, workstationDetails: { departmentId: 'd1' }, department: 'Finance', isActive: true },
  { id: 'c', employeeNo: '003', personalDetails: { firstName: 'New employee' }, departmentId: 'd2', department: 'Support', isActive: true }
];
const departments = [
  { id: 'd1', name: 'Finance', code: 'FIN', structureType: 'Department', isActive: 1, status: 'Active' },
  { id: 'd2', name: 'Support', structureType: 'Department', isActive: 1 },
  { id: 'empty', name: 'Empty', structureType: 'Department', isActive: 1 },
  { id: 'inactive', name: 'Inactive', structureType: 'Department', isActive: 0 }
];
const writes = [];
let fail = false;
const api = {
  getRosterGroups: async () => ({ data: { data: [{ id: 'r1', name: 'Main roster', status: 'Active', shifts: [{}] }] } }),
  getAssignments: async () => ({ data: { data: [] } }),
  async assignEmployees(payload) {
    writes.push(payload);
    if (fail) throw { response: { data: { message: 'No assignment changes were saved' } } };
    return { data: { data: { assignedCount: payload.departmentId ? 2 : 1 } } };
  }
};
const source = fs.readFileSync(path.join(__dirname, '../src/modules/attendance/components/AssignEmployee.tsx'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
const exportsObject = {};
vm.runInNewContext(code, {
  exports: exportsObject, console,
  require(id) {
    if (id === 'react') return react;
    if (id === 'react/jsx-runtime') return require(id);
    if (id === 'lucide-react') return new Proxy({}, { get: () => () => null });
    if (id.includes('employee_information_audit')) return { eimsApi: { getEmployees: async () => ({ data: { data: employees } }) } };
    if (id.includes('eimApi')) return { eimApi: { getStructures: async () => ({ data: { data: departments } }) } };
    return { attendanceApi: api };
  }
});
const render = () => { cursor = 0; const tree = exportsObject.default(); mounted = true; return tree; };
const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : node && typeof node === 'object' ? [node.props?.children].flat(Infinity).map(text).join('') : '';
const button = (tree, label) => nodes(tree).find(node => node.type === 'button' && text(node).trim() === label);
const byId = (tree, id) => nodes(tree).find(node => node.props?.id === id);

(async () => {
  render(); effects.forEach(callback => callback()); await new Promise(resolve => setImmediate(resolve));
  let tree = render();
  assert.ok(button(tree, 'Search department')); assert.ok(button(tree, 'Search employee'));
  button(tree, 'Search department').props.onClick(); tree = render();
  assert.ok(!text(tree).includes('Inactive'));
  byId(tree, 'roster-department-search').props.onChange({ target: { value: 'FIN' } }); tree = render();
  assert.ok(text(tree).includes('Finance')); assert.ok(!text(tree).includes('Support'));
  nodes(tree).find(node => node.type === 'button' && text(node).includes('FinanceFIN')).props.onClick(); tree = render();
  assert.match(text(tree), /2 active employees/);
  assert.ok(text(tree).includes('Alpha')); assert.ok(text(tree).includes('Beta')); assert.ok(!text(tree).includes('New employee'));
  byId(tree, 'employee-roster-select').props.onChange({ target: { value: 'r1' } }); tree = render();
  assert.equal(button(tree, 'Assign roster to 2 employees').props.disabled, false);
  fail = true; await button(tree, 'Assign roster to 2 employees').props.onClick(); tree = render();
  assert.match(text(tree), /No assignment changes were saved/);
  fail = false; await button(tree, 'Assign roster to 2 employees').props.onClick(); tree = render();
  assert.equal(writes.at(-1).departmentId, 'd1'); assert.equal(writes.at(-1).employeeIds, undefined);
  assert.match(text(tree), /2 employees in Finance were assigned/);
  button(tree, 'Search employee').props.onClick(); tree = render();
  assert.ok(!text(tree).includes('Selected department'));
  byId(tree, 'roster-employee-search').props.onChange({ target: { value: 'New employee' } }); tree = render();
  nodes(tree).find(node => node.type === 'button' && text(node).includes('New employee003')).props.onClick(); tree = render();
  byId(tree, 'employee-roster-select').props.onChange({ target: { value: 'r1' } }); tree = render();
  await button(tree, 'Assign roster').props.onClick();
  assert.deepEqual(Array.from(writes.at(-1).employeeIds), ['c']); assert.equal(writes.at(-1).departmentId, undefined);
  tree = render(); button(tree, 'Search department').props.onClick(); tree = render();
  nodes(tree).find(node => node.type === 'button' && text(node).trim() === 'Empty0 employees').props.onClick(); tree = render();
  assert.equal(button(tree, 'Assign roster to 0 employees').props.disabled, true);
  nodes(tree).find(node => node.props?.['aria-label'] === 'Clear selected department').props.onClick(); tree = render();
  assert.ok(!text(tree).includes('Selected department'));
  console.log('PASS: department and employee search modes, filtered department/member preview, correct bulk/single payloads, failure/retry/success, empty department guard, clear and switch controls.');
})().catch(error => { console.error(error); process.exitCode = 1; });
