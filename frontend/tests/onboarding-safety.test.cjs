const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const ts=require('typescript');
let states=[],index=0,pending=[],dependencies;
const react={useState(initial){const slot=index++;if(!(slot in states))states[slot]=initial;return[states[slot],value=>{states[slot]=typeof value==='function'?value(states[slot]):value;}];},useEffect(callback,deps){if(!dependencies||deps.some((d,i)=>d!==dependencies[i])){pending.push(callback);dependencies=deps;}}};
const api={getByToken:async()=>{throw new Error('offline');},decline:async()=>{throw new Error('offline');}};
function load(file,mocks){const output={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../src',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,{exports:output,URL,setTimeout,window:{location:{reload(){}}},require(id){if(id==='react')return react;if(id==='lucide-react')return new Proxy({},{get:(_,name)=>String(name)});if(id==='../../../lib/api')return{invitesApi:api};if(id==='../../../context/AuthContext')return{useAuth:()=>({setSession(){}})};return mocks?.[id]||require(id);}});return output;}
const Component=load('modules/onboarding/pages/InviteLanding.tsx').default;
function render(token){index=0;return Component({inviteToken:token,onNavigate(){}});}
const text=node=>node==null||typeof node==='boolean'?'':typeof node==='string'?node:Array.isArray(node)?node.map(text).join(' '):text(node.props?.children);
function find(node,label){if(!node||typeof node!=='object')return;if(node.type==='button'&&text(node).trim()===label)return node;for(const child of [node.props?.children].flat(Infinity)){const found=find(child,label);if(found)return found;}}
async function scenario(token,fetch){states=[];pending=[];dependencies=undefined;api.getByToken=fetch;render(token);pending.splice(0).forEach(fn=>fn());await new Promise(setImmediate);return render(token);}
(async()=>{
 let called=false;let tree=await scenario(undefined,async()=>{called=true;});assert.equal(called,false);assert.match(text(tree),/Invitation link is missing/);
 for(const [status,message]of [[404,/Invitation not found/],[410,/expired/],[500,/Unable to load/],[undefined,/Unable to load/]]){tree=await scenario('test-token',async()=>{throw{response:status?{status}:undefined};});assert.match(text(tree),message);assert.doesNotMatch(text(tree),/Sahan|sahan@email|Accept Invitation/);}
 tree=await scenario('test-token',async()=>({data:{data:{status:'PENDING',name:'Test candidate'}}}));assert.match(text(tree),/Test candidate/);await find(tree,'Decline').props.onClick();tree=render('test-token');assert.match(text(tree),/response has not been saved/);assert.doesNotMatch(text(tree),/Invitation Declined/);
 const {protectedFilePath}=load('components/ProtectedFile.tsx',{'../lib/api/client':{api:{}}});
 assert.equal(protectedFilePath('http://localhost:3001/uploads/a%20b.png'),'/api/files/a%20b.png');assert.equal(protectedFilePath('/api/files/a.png'),'/api/files/a.png');
 for(const value of ['https://other.example/file.png','/uploads/..','/uploads/a%2Fb.png','/uploads/a%5Cb.png'])assert.throws(()=>protectedFilePath(value));
 console.log('PASS: missing, invalid, expired and offline invitations; failed decline does not claim success; authenticated file paths reject traversal and external endpoints.');
})().catch(error=>{console.error(error);process.exitCode=1;});
