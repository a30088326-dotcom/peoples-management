const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');

const root = path.join(__dirname, '../src');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const icons = new Proxy({}, { get: (_, name) => String(name) });
const ScrollArea = 'WorkspaceScrollArea';
let currentUser;
let stateOverrides = [];
let stateIndex = 0;
const react = {
  useState(initial) {
    const value = stateOverrides[stateIndex++];
    return [value === undefined ? (typeof initial === 'function' ? initial() : initial) : value, () => {}];
  },
  useEffect() {},
  useRef: () => ({ current: null })
};

function load(file, dependencies) {
  const output = {};
  const code = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  vm.runInNewContext(code, {
    exports: output,
    URLSearchParams,
    window: { matchMedia: () => ({ matches: false }), location: { pathname: '/self_service', hash: '', search: '' } },
    require(id) {
      if (id === 'react') return react;
      if (id === 'react/jsx-runtime') return require(id);
      if (id === 'lucide-react') return icons;
      if (id.endsWith('/AuthContext')) return { useAuth: () => ({ user: currentUser, logout() {} }) };
      if (id.endsWith('/WorkspaceScrollArea')) return { default: ScrollArea };
      if (Object.hasOwn(dependencies, id)) return dependencies[id];
      throw new Error(`Unexpected dependency ${id} in ${file}`);
    }
  });
  return output.default;
}

function render(Component, props, overrides = []) {
  stateIndex = 0;
  stateOverrides = overrides;
  return Component(props);
}

function find(element, predicate) {
  if (!element || typeof element !== 'object') return;
  if (predicate(element)) return element;
  const children = element.props?.children;
  for (const child of (Array.isArray(children) ? children.flat(Infinity) : [children])) {
    const result = find(child, predicate);
    if (result) return result;
  }
}

const Layout = load('components/UnifiedLayout.tsx', {
  'framer-motion': { motion: new Proxy({}, { get: (_, name) => `motion.${String(name)}` }), AnimatePresence: 'AnimatePresence' },
  '../lib/api': { usersApi: {} },
  '../modules/performance/api/performanceApi': { performanceApi: {} },
  '../modules/performance/navigation': { performanceNavigation: [], performanceSectionFromHash: () => 'overview' },
  '../modules/performance/roleSections': { sectionsFor() {} }
});

const child = { employeeForm: 'unsaved data' };
for (const flags of [{}, { isManager: true }, { isExecutive: true }]) {
  currentUser = { id: 'test-employee', role: 'EMPLOYEE', name: 'Test employee', permissions: [], ...flags };
  for (const screen of ['self_service', 'performance', 'reporting-hierarchy', 'team-attendance', 'executive-request-center', 'assistant']) {
    const tree = render(Layout, { currentScreen: screen, children: child, onNavigate() {} });
    const main = find(tree, item => item.props?.['data-testid'] === 'workspace-main');
    assert.ok(main, `Employee workspace missing for ${screen}`);
    assert.match(main.props.className, /h-screen overflow-hidden/);
    assert.match(main.props.className, /min-w-0/);
    const content = find(main, item => item.props?.['data-testid'] === 'workspace-module' || item.type === ScrollArea);
    assert.equal(content.props.children, child, 'Role changes must not change or remount module content');
  }
}

const Hub = load('modules/self_service/pages/SSHRHub.tsx', {
  '../../../lib/api/employee_information_audit': { eimsApi: {} },
  './Dashboard': { default: 'EmployeeDashboard' }, './MyProfile': { default: 'MyProfile' },
  './MyRequests': { default: 'MyRequests' }, './MyLeave': { default: 'MyLeave' },
  './MyAttendance': { default: 'MyAttendance' }, './MyShift': { default: 'MyShift' },
  './MyReportingManager': { default: 'MyReportingManager' },
  '../../assistant/Assistant': { CustomEmployeeFields: 'CustomEmployeeFields' }
});
for (const tab of ['dashboard', 'profile', 'requests', 'leave', 'attendance', 'shift', 'manager']) {
  const tree = render(Hub, {}, [tab, { id: 'test-employee' }, false]);
  assert.match(tree.props.className, /workspace-frame/);
  const heading = find(tree, item => item.type === 'h1');
  assert.match(tree.props.children[0].props.className, /shrink-0/);
  assert.equal(heading.props.children, 'Self Service');
  if (tab !== 'profile') {
    const pane = find(tree, item => item.type === ScrollArea);
    assert.equal(pane.props.resetKey, tab);
  } else {
    const profile = find(tree, item => item.type === 'MyProfile');
    assert.equal(profile.props.children.props.employeeId, 'test-employee', 'Custom profile fields stay inside the bounded profile content');
  }
}

const Profile = load('modules/self_service/pages/MyProfile.tsx', {
  '../../employee_information/components/tabs/AttachmentsTab': { default: 'AttachmentsTab' },
  '../components/ProfileRequestForm': { default: 'ProfileRequestForm', ProfileRequestContext: { Provider: 'ProfileRequestProvider' } },
  '../components/ProfileBasicInfo': { default: 'ProfileBasicInfo' },
  '../components/ProfileDependents': { default: 'ProfileDependents' },
  '../components/ProfileProfessional': { default: 'ProfileProfessional' },
  '../components/ProfileSensitive': { default: 'ProfileSensitive' }
});
for (const section of ['basic', 'dependents', 'professional', 'sensitive', 'documents']) {
  const tree = render(Profile, { employee: {}, loading: false, children: child }, [section]);
  assert.match(find(tree,item=>item.type==='div'&&/max-w-7xl/.test(item.props?.className||'')).props.className, /min-h-0 min-w-0/);
  const nav = find(tree, item => item.type === 'nav');
  assert.equal(nav.props['aria-label'], 'Profile sections');
  const pane = find(tree, item => item.type === ScrollArea);
  assert.equal(pane.props.resetKey, section);
  assert.equal(pane.props.children.at(-1), child);
}
console.log('PASS: employee, manager and CEO workspace bounds; all self-service and profile tabs');
