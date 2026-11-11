import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { isOrganizationScope } from '../../shared/services/access-scope';
import { inputSchema, periodSchema, profileSchema, rulesSchema } from './calculation';
import { changeRun, saveInput, saveProfile, saveRules, viewPayroll } from './service';
import { payrollReader, PayrollError } from './store';

const router = Router();
router.use(requireAuth);
type Action = 'canView' | 'canCreate' | 'canEdit' | 'canApprove' | 'canExport';
async function permissions(req: Request) {
  const actor = req.user!;
  if (actor.role === 'SUPER_ADMIN') return { canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true };
  const [record] = await payrollReader().list('user_module_permissions', row => row.userId === actor.userId && row.moduleId === 'payroll_management');
  const allowed = record?.moduleAccess && isOrganizationScope(record.dataScope);
  return { canView: Boolean(allowed && record.canView), canCreate: Boolean(allowed && record.canCreate),
    canEdit: Boolean(allowed && record.canEdit), canApprove: Boolean(allowed && record.canApprove), canExport: Boolean(allowed && record.canExport) };
}
const handle = (work: (req: Request, res: Response) => Promise<unknown>) => async (req: Request, res: Response) => {
  try { await work(req, res); }
  catch (error) {
    if (error instanceof z.ZodError) res.status(400).json({ success: false, message: error.issues[0]?.message || 'Check the payroll inputs.' });
    else if (error instanceof PayrollError) res.status(error.status).json({ success: false, message: error.message });
    else if (error instanceof Error && (error.name === 'StorageConflictError' || 'code' in error && ['ER_DUP_ENTRY', 'ER_LOCK_DEADLOCK'].includes(String(error.code)))) {
      res.status(409).json({ success: false, message: 'Payroll changed elsewhere. Refresh the period and retry.' });
    } else {
      console.error('Payroll request failed:', error instanceof Error ? error.name : 'unknown');
      res.status(500).json({ success: false, message: 'Could not complete the payroll request.' });
    }
  }
};
function allow(action: Action) {
  return (req: Request, res: Response, next: NextFunction) => handle(async () => {
    const access = await permissions(req);
    if (!access.canView || !access[action]) throw new PayrollError(403, 'Organization-wide Payroll Management access is required.');
    res.locals.payrollAccess = access;
    next();
  })(req, res);
}
const period = (req: Request) => periodSchema.parse(req.params.period);
router.get('/:period', allow('canView'), handle(async (req, res) => {
  res.json({ success: true, data: { ...await viewPayroll(period(req)), access: res.locals.payrollAccess } });
}));
router.put('/profiles/save', allow('canEdit'), handle(async (req, res) => {
  await saveProfile(profileSchema.parse(req.body)); res.json({ success: true });
}));
router.put('/rules/save', allow('canEdit'), handle(async (req, res) => {
  await saveRules(rulesSchema.parse(req.body)); res.json({ success: true });
}));
router.put('/:period/inputs', allow('canEdit'), handle(async (req, res) => {
  await saveInput(period(req), inputSchema.parse(req.body)); res.json({ success: true });
}));
for (const action of ['calculate', 'submit', 'approve', 'return'] as const) {
  const access = action === 'calculate' ? 'canCreate' : action === 'submit' ? 'canEdit' : 'canApprove';
  router.post(`/:period/${action}`, allow(access), handle(async (req, res) => {
    const version = z.number().int().nonnegative().parse(req.body?.version);
    res.json({ success: true, data: await changeRun(period(req), action, version, req.user!.userId) });
  }));
}
export default router;
