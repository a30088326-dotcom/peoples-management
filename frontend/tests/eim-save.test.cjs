const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.join(__dirname,'../src');
function load(relative,imports){const output={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,relative),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,{exports:output,require(id){if(id in imports)return imports[id];if(id==='react/jsx-runtime')return require(id);if(id==='lucide-react')return new Proxy({},{get:(_,key)=>String(key)});throw new Error(id);},console});return output;}
let calls=[],fail=false,states=[],index=0,effects=[],runEffects=true;
const api={};for(const method of ['get','post','put','delete'])api[method]=async(url,body)=>{calls.push({method,url,body});if(fail&&method!=='get')throw{response:{data:{message:'Synthetic save failure'}}};return{data:{success:true,data:[{id:'ref',name:'Reference',structureType:'Department'}]}};};
const eimApi=load('lib/api/eimApi.ts',{'./client':{api}}).eimApi;
const react={useState(initial){const slot=index++;if(!(slot in states))states[slot]=initial;return[states[slot],value=>states[slot]=typeof value==='function'?value(states[slot]):value];},useEffect(fn){if(runEffects)effects.push(fn);}};
const Entity=load('modules/eim/EntityModal.tsx',{react,'../../lib/api/eimApi':{eimApi}}).default;
const {AddEditNodeForm}=load('modules/eim/components/hierarchy/HierarchyForms.tsx',{react,'../../../../lib/api/eimApi':{eimApi}});
function find(node,predicate){if(!node||typeof node!=='object')return;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const result=find(child,predicate);if(result)return result;}}
function render(props){index=0;return Entity(props);}
const types=fs.readFileSync(path.join(root,'modules/eim/EntityModal.tsx'),'utf8').match(/export type EntityType = ([^;]+);/)[1].match(/'([^']+)'/g).map(value=>value.slice(1,-1));
(async()=>{
 for(const entityType of types)for(const editing of [false,true]){
  states=[];effects=[];calls=[];runEffects=true;let closed=false;
  const props={entityType,initialData:editing?{id:'synthetic',name:'Synthetic',code:'TEST',isActive:0,defaultAmount:0,category:'Insurance'}:undefined,onClose(refresh){closed=refresh;}};
  render(props);await Promise.all(effects.map(fn=>fn()));runEffects=false;const tree=render(props);
  await find(tree,node=>node.type==='form').props.onSubmit({preventDefault(){}});
  assert.equal(closed,true,`${entityType} ${editing?'update':'create'} should complete`);
  const writes=calls.filter(call=>call.method!=='get');assert.equal(writes.length,1,`${entityType} must issue exactly one save`);assert.equal(writes[0].method,editing?'put':'post');
  assert.equal(writes[0].body.isActive,!editing,'An unchanged inactive record must remain inactive');
  if(entityType==='geography')assert.equal(find(tree,node=>node.type==='input'&&node.props?.required)?.props.type,'text','Geography has a required code/name field');
  if(entityType==='benefit'&&editing){assert.equal(find(tree,node=>node.type==='input'&&node.props?.type==='number').props.value,0);assert.ok(find(tree,node=>node.type==='option'&&node.props?.value==='Insurance'));}
  if(entityType==='department')assert.equal(writes[0].url,editing?'/api/eim/structures/synthetic':'/api/eim/structures');
 }
 states=[];effects=[];calls=[];runEffects=false;
 index=0;const hierarchy=AddEditNodeForm({node:{id:'synthetic',name:'Unit',code:'UNIT',companyId:'company',locationId:'location',costCentreId:'cost',parentId:'parent',effectiveStartDate:'2026-10-23'},hierarchyConfig:[],onClose(){},onSuccess(){}});
 await find(hierarchy,node=>node.type==='form').props.onSubmit({preventDefault(){}});
 assert.equal(calls[0].body.companyId,'company');assert.equal(calls[0].body.locationId,'location');assert.equal(calls[0].body.costCentreId,'cost');assert.equal(calls[0].body.parentId,'parent');assert.equal(calls[0].body.effectiveStartDate,'2026-10-23');
 states=[];effects=[];calls=[];runEffects=false;fail=true;let closed=false;
 const props={entityType:'company',initialData:{id:'synthetic'},onClose(){closed=true;}};
 await find(render(props),node=>node.type==='form').props.onSubmit({preventDefault(){}});
 assert.equal(closed,false);assert.ok(find(render(props),node=>node.props?.role==='alert'));
 console.log(`PASS: ${types.length*2} EIM create/edit save bindings, reference dropdown rendering, department updates, hierarchy edits preserve company/location/cost-centre mappings, and failed-save recovery.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
