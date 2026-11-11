const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
let user,states,index,effects,pathname;
const react={useState(initial){const slot=index++;if(!(slot in states))states[slot]=typeof initial==='function'?initial():initial;return[states[slot],value=>{states[slot]=value;}];},useEffect(fn){effects.push(fn);}};
const output={};
const window={location:{get pathname(){return pathname;},search:''},history:{pushState(_,__,path){pathname=path;},replaceState(_,__,path){pathname=path;}},addEventListener(){},removeEventListener(){}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../src/App.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,{exports:output,window,document:{title:'Test'},URLSearchParams,require(id){if(id==='react')return react;if(id==='react/jsx-runtime')return require(id);if(id.endsWith('/AuthContext'))return{AuthProvider:'AuthProvider',useAuth:()=>({user,isLoggedIn:true,isLoading:false})};if(id.endsWith('/Assistant'))return{AssistantProvider:'AssistantProvider',FloatingAssistant:'FloatingAssistant',ExtensionToolbar:'ExtensionToolbar'};return{default:id};}});
const Main=output.default().props.children.type;
function render(){index=0;effects=[];return Main();}
function find(node,predicate){if(!node||typeof node!=='object')return;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const value=find(child,predicate);if(value)return value;}}
function scenario(role,path,permissions=[]){user={id:'test',role,permissions};states=[];index=0;pathname=path;let tree=render();effects.forEach(fn=>fn());tree=render();effects.forEach(fn=>fn());return render();}
let tree=scenario('EMPLOYEE','/dashboard');assert.equal(find(tree,n=>n.props?.currentScreen)?.props.currentScreen,'self_service');
tree=scenario('ADMIN','/eim',[{moduleId:'eim_admin',moduleAccess:0,canView:0},{moduleId:'employee_information',moduleAccess:0,canView:0}]);assert.equal(find(tree,n=>n.props?.currentScreen)?.props.currentScreen,'reporting-hierarchy');
tree=scenario('ADMIN','/dashboard',[{moduleId:'reports_analytics',moduleAccess:1,canView:1}]);assert.equal(find(tree,n=>n.props?.currentScreen)?.props.currentScreen,'dashboard');
tree=scenario('CANDIDATE','/dashboard');assert.equal(find(tree,n=>n.props?.currentScreen)?.props.currentScreen,'onboarding');
tree=scenario('SUPER_ADMIN','/access-control');assert.equal(find(tree,n=>n.props?.currentScreen)?.props.currentScreen,'access-control');
user={id:'test',role:'EMPLOYEE',permissions:[]};states=[];pathname='/dashboard';tree=render();assert.equal(tree.props.role,'status');assert.doesNotMatch(JSON.stringify(tree),/403 Unauthorized/);
console.log('PASS: employee and candidate landing pages, explicit admin module denials, safe fallback when all assigned modules are disabled, Super Admin access and no login-time 403 flash.');
