import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireModuleAction } from '../../../middleware/module-action';
import { RosterError, validRosterDate } from '../roster-validation';
import { changeSchema, daysBetween, draftSchema } from './pattern';
import { changePublishedShift, deleteRosterDraft, publishRoster, rosterCalendar, rosterDetail, rosterOptions, saveDraft } from './service';

const router = Router();
const action = (permission: Parameters<typeof requireModuleAction>[1]) => requireModuleAction('attendance_management', permission);
const version = z.number().int().positive();
const id = z.string().min(1).max(36).regex(/^[\w-]+$/);
const date = z.string().refine(validRosterDate, 'Enter a valid calendar date.');
const calendarQuery = z.object({ from: date, to: date, departmentId: id.optional(), rosterId: id.optional() });

function handle(work: (request: Request, response: Response) => Promise<unknown>) {
  return async (request: Request, response: Response) => {
    try { await work(request, response); }
    catch (error) {
      if (error instanceof z.ZodError) {
        response.status(400).json({ success: false, message: error.issues[0]?.message || 'Check the roster details.' });
      } else if (error instanceof RosterError) {
        response.status(error.status).json({ success: false, message: error.message, conflicts: error.details });
      } else if (error instanceof Error && (error.name === 'StorageConflictError' || 'code' in error && error.code === 'ER_LOCK_DEADLOCK')) {
        response.status(409).json({ success: false, message: 'The schedule changed during this operation. Refresh the roster and try again.' });
      } else {
        console.error('Roster planner request failed:', error instanceof Error ? error.name : 'unknown');
        response.status(500).json({ success: false, message: 'The roster could not be loaded or saved. Try again.' });
      }
    }
  };
}

router.get('/', action('canView'), handle(async (req, res) => res.json({ success: true, data: await rosterOptions(req.user!.userId) })));
router.get('/calendar', action('canView'), handle(async (req, res) => {
  const query = calendarQuery.parse(req.query);
  const days = daysBetween(query.from, query.to);
  if (days < 0 || days >= 31) throw new RosterError(400, 'Choose a calendar range of up to 31 days.');
  res.json({ success: true, data: await rosterCalendar(req.user!.userId, query) });
}));
router.get('/:id', action('canView'), handle(async (req, res) => res.json({ success: true, data: await rosterDetail(req.user!.userId, id.parse(req.params.id)) })));
router.post('/', action('canCreate'), handle(async (req, res) => res.status(201).json({ success: true, data: await saveDraft(req.user!.userId, draftSchema.parse(req.body)) })));
router.put('/:id', action('canEdit'), handle(async (req, res) => {
  const input = z.object({ draft: draftSchema, version }).parse(req.body);
  res.json({ success: true, data: await saveDraft(req.user!.userId, input.draft, { id: id.parse(req.params.id), version: input.version }) });
}));
router.delete('/:id', action('canDelete'), handle(async (req, res) => {
  res.json({ success: true, data: await deleteRosterDraft(req.user!.userId, id.parse(req.params.id), version.parse(req.body?.version)) });
}));
router.post('/:id/publish', action('canApprove'), handle(async (req, res) => {
  res.json({ success: true, data: await publishRoster(req.user!.userId, id.parse(req.params.id), version.parse(req.body?.version)) });
}));
router.patch('/:id/shift', action('canEdit'), handle(async (req, res) => {
  res.json({ success: true, data: await changePublishedShift(req.user!.userId, id.parse(req.params.id), changeSchema.parse(req.body)) });
}));

export default router;
