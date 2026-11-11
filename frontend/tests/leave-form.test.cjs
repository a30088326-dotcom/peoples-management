const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
let states=[],index=0,saved;
const react={useState(initial){const slot=index++;if(!(slot in states))states[slot]=initial;return[states[slot],value=>{states[slot]=typeof value==='function'?value(states[slot]):value;}];},useEffect(){}};
const output={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../src/modules/leave_management/components/modals/RequestTimeOffModal.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,{exports:output,URL,FormData,Date,require(id){if(id==='react')return react;if(id==='react/jsx-runtime')return require(id);if(id==='framer-motion')return{motion:new Proxy({},{get:(_,key)=>`motion.${String(key)}`}),AnimatePresence:'AnimatePresence'};if(id==='lucide-react')return new Proxy({},{get:(_,key)=>String(key)});if(id==='react-day-picker')return{DayPicker:'DayPicker'};if(id.endsWith('.css'))return{};if(id.endsWith('/client'))return{api:{get:async()=>({data:{data:[]}})}};if(id.endsWith('/employee_information_audit'))return{eimsApi:{uploadAttachments:async()=>({data:{data:[{fileUrl:'/api/files/synthetic-certificate.png'}]}})}};throw new Error(id);}});
const text=node=>node==null||typeof node==='boolean'?'':typeof node==='string'?node:typeof node==='number'?String(node):Array.isArray(node)?node.map(text).join(' '):text(node.props?.children);
function find(node,predicate){if(!node||typeof node!=='object')return;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const match=find(child,predicate);if(match)return match;}}
const type={id:'type',name:'Medical leave',allowHalfDays:1,requireCoveringEmp:1,needMedicalCertificate:1,maxDaysWithoutMedCert:0,requireAttachment:1,commentMandatory:1};
const props={showRequestModal:true,setShowRequestModal(){},selectedLeaveType:'type',setSelectedLeaveType(){},selectedDates:[new Date(2026,9,26)],setSelectedDates(){},reason:'',setReason(){},isSubmitting:false,handleSubmit(value){saved=value;},leaveTypes:[type],selectedEntitlement:{totalDays:10,usedDays:0,pendingDays:0},projectedDeduction:1,employeeId:'employee'};
function render(){index=0;return output.default(props);}
function submit(tree){find(tree,n=>n.type==='button'&&text(n).trim().startsWith('Submit Request')).props.onClick();}
(async()=>{
 let tree=render();submit(tree);assert.match(text(render()),/A reason is required/);
 props.reason='Synthetic medical request';tree=render();submit(tree);assert.match(text(render()),/Select a covering employee/);
 find(tree,n=>n.props?.['aria-label']==='Covering employee').props.onChange({target:{value:'manager'}});
 tree=render();find(tree,n=>n.props?.['aria-label']==='Leave duration').props.onChange({target:{value:'FIRST_HALF'}});
 tree=render();assert.match(text(tree),/Submit Request \(0.5 days\)/);submit(tree);assert.match(text(render()),/Upload your medical certificate/);assert.equal(saved,undefined);
 tree=render();find(tree,n=>n.type==='input'&&n.props?.type==='file').props.onChange({target:{files:[new File(['synthetic certificate'],'certificate.png',{type:'image/png'})]}});await new Promise(setImmediate);
 tree=render();assert.match(text(tree),/Attached:\s+certificate\.png/);submit(tree);assert.equal(saved.halfDayType,'FIRST_HALF');assert.equal(saved.coveringEmployeeId,'manager');assert.equal(saved.attachmentUrl,'/api/files/synthetic-certificate.png');assert.equal(saved.medCertSubmitted,true);
 props.selectedDates.push(new Date(2026,9,27));props.projectedDeduction=2;tree=render();assert.equal(find(tree,n=>n.props?.['aria-label']==='Leave duration'),undefined);submit(tree);assert.equal(saved.halfDayType,'NONE');
 console.log('PASS: half-day leave totals, required reason/cover/certificate, private supporting upload, medical metadata and multi-day guard.');
})().catch(error=>{console.error(error);process.exitCode=1;});
