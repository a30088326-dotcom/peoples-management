// Read-only component checks with real, permission-filtered demo data.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { sectionsFor } from '../src/modules/performance/roleSections';
import AssessmentForm from '../src/modules/performance/components/AssessmentForm';
import Overview from '../src/modules/performance/components/Overview';
import type { Review, Workspace } from '../src/modules/performance/types';
const backendRequire = createRequire(new URL('../../backend/package.json', import.meta.url));
backendRequire('dotenv').config();

async function main() {
  const { db } = await import('../../backend/src/lib/db');
  try {
    const { directory } = await import('../../backend/src/shared/services/organization.service');
    const { actorFor } = await import('../../backend/src/modules/performance/store');
    const { workspace, reviewDetails } = await import('../../backend/src/modules/performance/query.service');
    const employees = await directory();
    const person = (number: string) => employees.find(e => e.employeeNumber === number)!;
    const employee = await actorFor(person('EMP-027').userId!);
    const data = await workspace(employee) as Workspace;
    const sections = sectionsFor(data);
    assert.deepEqual(sections, ['overview', 'goals', 'self', 'development', 'feedback']);
    const currentCycle = data.cycles.find(c => c.demo && c.status === 'ACTIVE')!;
    const previousCycle = data.cycles.find(c => c.demo && c.status === 'CLOSED')!;
    const current = await reviewDetails(employee, data.reviews.find(r => r.cycleId === currentCycle.id)!.id) as Review;
    const previous = await reviewDetails(employee, data.reviews.find(r => r.cycleId === previousCycle.id)!.id) as Review;
    const action = async () => true;
    const draft = renderToStaticMarkup(<AssessmentForm review={current} kind="self" action={action} />);
    assert.match(draft, /Save draft/); assert.match(draft, /Share assessment/);
    assert.doesNotMatch(draft, /My review outcome/);
    const closed = renderToStaticMarkup(<AssessmentForm review={previous} kind="self" action={action} />);
    assert.match(closed, /My review outcome/); assert.match(closed, /Acknowledge receipt/);
    assert.match(closed, /View manager ratings and answers/); assert.doesNotMatch(closed, /Save draft/);
    const ownOverview = renderToStaticMarkup(<Overview data={data} reviews={data.reviews.filter(r => r.cycleId === currentCycle.id)} navigate={() => {}} open={() => {}} />);
    assert.match(ownOverview, /My performance/); assert.doesNotMatch(ownOverview, /Company performance|Team performance|New cycle/);
    const managerData = await workspace(await actorFor(person('EMP-009').userId!)) as Workspace;
    assert.ok(sectionsFor(managerData).includes('manager')); assert.ok(!sectionsFor(managerData).includes('cycles'));
    const teamOverview = renderToStaticMarkup(<Overview data={managerData} reviews={managerData.reviews.filter(r => r.cycleId === currentCycle.id)} navigate={() => {}} open={() => {}} />);
    assert.match(teamOverview, /Team performance/); assert.doesNotMatch(teamOverview, /Company performance/);
    const ceoData = await workspace(await actorFor(person('EMP-003').userId!)) as Workspace;
    const companyOverview = renderToStaticMarkup(<Overview data={ceoData} reviews={ceoData.reviews.filter(r => r.cycleId === currentCycle.id)} navigate={() => {}} open={() => {}} />);
    assert.match(companyOverview, /Company performance/);
    console.log('PASS: Employee-only sections, editable self draft, final result/acknowledgement, manager team view and CEO company view.');
  } finally { await db.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
