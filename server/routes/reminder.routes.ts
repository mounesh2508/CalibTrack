import { Router, Request, Response } from 'express';
import { reminderService } from '../services/reminder.service';
import { memoryStore } from '../database/config';

const router = Router();

// GET /api/reminders/settings
router.get('/settings', (req: Request, res: Response) => {
  try {
    const settings = reminderService.getSettings();
    res.json({
      success: true,
      data: settings,
      reminder_days_before: settings.reminder_days_before,
      email_enabled: settings.email_enabled,
      in_app_enabled: settings.in_app_enabled,
      smtp_configured: true,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve reminder settings' });
  }
});

// PUT /api/reminders/settings
router.put('/settings', (req: Request, res: Response) => {
  try {
    const updated = reminderService.updateSettings(req.body);
    res.json({
      success: true,
      message: 'Reminder configuration updated successfully',
      data: updated,
      reminder_days_before: updated.reminder_days_before,
      email_enabled: updated.email_enabled,
      in_app_enabled: updated.in_app_enabled,
      smtp_configured: true,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update reminder settings' });
  }
});

// POST /api/reminders/trigger
router.post('/trigger', async (req: Request, res: Response) => {
  try {
    const result = await reminderService.evaluateAndDispatch();
    res.json(result);
  } catch (err: any) {
    console.error('[CalibTrack Reminder] Trigger error:', err);
    res.status(500).json({ error: err.message || 'Failed to evaluate and dispatch reminders' });
  }
});

// GET /api/reminders/preview-due
router.get('/preview-due', (req: Request, res: Response) => {
  try {
    const settings = reminderService.getSettings();
    const noticeWindowDays = settings.reminder_days_before || 30;
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    const qualifying = memoryStore.equipment
      .filter((eq) => eq.next_calibration_date)
      .map((eq) => {
        const dueDate = new Date(eq.next_calibration_date!);
        const diffMs = dueDate.getTime() - today.getTime();
        const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));
        const isOverdue = daysRemaining < 0;
        const isDueSoon = daysRemaining >= 0 && daysRemaining <= noticeWindowDays;

        return {
          id: eq.id,
          code: eq.equipment_code,
          name: eq.name,
          department: eq.department,
          location: eq.location,
          dueDate: eq.next_calibration_date,
          daysRemaining,
          isOverdue,
          isDueSoon,
          status: isOverdue ? 'OVERDUE' : isDueSoon ? 'DUE_SOON' : 'CALIBRATED',
        };
      })
      .filter((eq) => eq.isOverdue || eq.isDueSoon);

    res.json({
      success: true,
      count: qualifying.length,
      dueSoonCount: qualifying.filter((e) => e.isDueSoon).length,
      overdueCount: qualifying.filter((e) => e.isOverdue).length,
      items: qualifying,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to preview due calibrations' });
  }
});

export default router;
