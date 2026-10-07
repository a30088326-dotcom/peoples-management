require('dotenv').config({ quiet: true });
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
async function main() {
  const c = await mysql.createConnection(process.env.DATABASE_URL);
  const [[user]] = await c.query("SELECT u.id,u.email,u.role FROM users u JOIN employee_information_employees e ON e.userId=u.id WHERE e.employeeNumber='EMP-001'");
  const identities=[];
  for(const number of ['EMP-001','EMP-002','EMP-003','EMP-011']) { const [[u]]=await c.query('SELECT u.id,u.email,u.role,e.id AS employeeId FROM users u JOIN employee_information_employees e ON e.userId=u.id WHERE e.employeeNumber=?',[number]); identities.push({number,user:u}); }
  const out=[];
  for(const identity of identities){
    const token = jwt.sign({ userId:identity.user.id,email:identity.user.email,role:identity.user.role }, process.env.JWT_SECRET, { expiresIn:'5m' });
    const headers={Authorization:`Bearer ${token}`};
    const paths=['/api/auth/me','/api/organization/dashboard','/api/reporting-hierarchy/tree?mode=all','/api/attendance/dashboard','/api/attendance/team-monthly','/api/performance/workspace','/api/users?limit=500','/api/employee_information/audit',`/api/employee_information/audit/${identity.user.employeeId}`];
    for(const path of paths){const response=await fetch(`http://localhost:${process.env.SMOKE_PORT||3101}${path}`,{headers});let body;try{body=await response.json();}catch{body={};}out.push({employee:identity.number,path,status:response.status,success:body.success,message:body.message||null,count:Array.isArray(body.data)?body.data.length:undefined,keys:body.data&&typeof body.data==='object'&&!Array.isArray(body.data)?Object.keys(body.data):undefined});}
  }
  await c.end(); console.log(JSON.stringify(out,null,2));
}
main().catch(e=>{console.error(e.message);process.exit(1)});
