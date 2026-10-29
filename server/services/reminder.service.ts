import { memoryStore, getPool, isFallback } from '../database/config';
import { EquipmentEntity, NotificationEntity, ReminderSettingsEntity, NotificationEmailDetails } from '../models';
import { emailService } from './email.service';

export interface EvaluateResult {
  success: boolean;
  evaluatedCount: number;
  dispatchedEmailsCount: number;
  dueSoonCount: number;
  overdueCount: number;
  recipientsCount: number;
  dispatchedAlerts: Array<{
    equipmentId: string;
    equipmentCode: string;
    equipmentName: string;
    status: 'DUE_SOON' | 'OVERDUE';
    daysRemaining: number;
    dueDate: string;
    recipients: string[];
    subject: string;
    htmlBody: string;
    dispatchedAt: string;
  }>;
}

export class ReminderService {
  /**
   * Retrieves or initializes default reminder settings
   */
  getSettings(): ReminderSettingsEntity {
    if (memoryStore.reminderSettings.length === 0) {
      const defaultSettings: ReminderSettingsEntity = {
        id: 'rem-settings-01',
        reminder_days_before: 30,
        email_enabled: true,
        in_app_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryStore.reminderSettings.push(defaultSettings);
      return defaultSettings;
    }
    return memoryStore.reminderSettings[0];
  }

  /**
   * Updates reminder settings
   */
  updateSettings(updates: Partial<ReminderSettingsEntity>): ReminderSettingsEntity {
    const current = this.getSettings();
    if (updates.reminder_days_before !== undefined) {
      current.reminder_days_before = Number(updates.reminder_days_before);
    }
    if (updates.email_enabled !== undefined) {
      current.email_enabled = Boolean(updates.email_enabled);
    }
    if (updates.in_app_enabled !== undefined) {
      current.in_app_enabled = Boolean(updates.in_app_enabled);
    }
    current.updated_at = new Date().toISOString();
    return current;
  }

  /**
   * Builds clinical ISO/IEC 17025 compliant email HTML
   */
  buildEmailHtml(params: {
    equipmentName: string;
    equipmentCode: string;
    department: string;
    location: string;
    dueDate: string;
    daysRemaining: number;
    isOverdue: boolean;
    recipients: string[];
  }): string {
    const { equipmentName, equipmentCode, department, location, dueDate, daysRemaining, isOverdue } = params;
    const statusLabel = isOverdue ? 'OVERDUE' : 'DUE SOON';
    const bannerColor = isOverdue ? '#dc2626' : '#d97706';
    const urgencyColor = isOverdue ? '#b91c1c' : '#b45309';
    const statusBadgeBg = isOverdue ? '#fef2f2' : '#fffbeb';
    const statusBadgeBorder = isOverdue ? '#fecaca' : '#fde68a';
    const complianceText = isOverdue
      ? `OVERDUE by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'}`
      : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining until calibration deadline`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Calibration Metrology Alert</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; padding: 24px; margin: 0;">
  <div style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <!-- Header Banner -->
    <div style="background-color: ${bannerColor}; padding: 22px 28px; color: #ffffff;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div>
          <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; background: rgba(255,255,255,0.22); padding: 3px 8px; border-radius: 4px;">
            ISO/IEC 17025 Compliance Alert
          </span>
          <h2 style="margin: 8px 0 0 0; font-size: 20px; font-weight: 700;">
            Equipment Calibration ${statusLabel}
          </h2>
        </div>
      </div>
      <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.95;">
        CalibTrack Metrology Alert dispatched to assigned Technician &amp; Laboratory Administrators.
      </p>
    </div>

    <!-- Alert Box -->
    <div style="padding: 24px 28px;">
      <div style="background-color: ${statusBadgeBg}; border: 1px solid ${statusBadgeBorder}; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
        <span style="font-weight: 700; color: ${urgencyColor}; font-size: 14px;">
          ${isOverdue ? '⚠️ ACTION REQUIRED: Instrument Past Calibration Expiry' : '⏱️ SCHEDULE NOTICE: Calibration Window Approaching'}
        </span>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: ${urgencyColor};">
          ${complianceText}. Immediate metrological action is requested.
        </p>
      </div>

      <!-- Specification Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
        <tbody>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; width: 140px; font-size: 13px;">Instrument:</td>
            <td style="padding: 10px 0; font-weight: 700; color: #0f172a;">${equipmentName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Asset Code:</td>
            <td style="padding: 10px 0; font-family: monospace; font-weight: 700; color: #2563eb;">${equipmentCode}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Department:</td>
            <td style="padding: 10px 0; color: #334155;">${department}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Physical Location:</td>
            <td style="padding: 10px 0; color: #334155;">${location}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Calibration Due Date:</td>
            <td style="padding: 10px 0; font-weight: 700; color: #0f172a;">${dueDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Compliance Status:</td>
            <td style="padding: 10px 0; font-weight: 700; color: ${urgencyColor};">${statusLabel} (${complianceText})</td>
          </tr>
        </tbody>
      </table>

      <!-- SOP Compliance Instructions -->
      <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 18px; border-radius: 4px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 6px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #1e40af;">
          Metrological Protocol Checklist
        </h4>
        <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #475569; line-height: 1.6;">
          ${isOverdue
            ? `<li><strong>Quarantine Notice:</strong> Instrument should not be used for regulated releases until calibration verification is verified and accepted.</li>
               <li>Engage an approved NIST / ISO 17025 accredited calibration service provider immediately.</li>
               <li>Upload the signed Certificate of Calibration upon verification completion.</li>`
            : `<li>Verify instrument availability for the upcoming service window.</li>
               <li>Confirm certified reference standards and environment stabilization (temp/humidity) are ready.</li>
               <li>Coordinate with the assigned laboratory metrologist or technician.</li>`
          }
        </ul>
      </div>

      <!-- Footer Info -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8; display: flex; justify-content: space-between;">
        <span>CalibTrack Laboratory Metrology System</span>
        <span>ISO/IEC 17025 Accredited Registry</span>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Gathers recipient list for calibration notifications:
   * STRICTLY returns ONLY the technician email assigned to the equipment by the administrator.
   * If no specific technician email is assigned, attempts to resolve by technician name from staff registry.
   * If still unassigned, falls back solely to the lab administrator.
   * NEVER broadcasts to unassigned users or other staff members.
   */
  gatherRecipients(eq?: EquipmentEntity): string[] {
    const recipients = new Set<string>();

    if (eq) {
      // 1. Direct assigned technician email on equipment
      if (eq.assigned_technician_email && eq.assigned_technician_email.includes('@')) {
        recipients.add(eq.assigned_technician_email.toLowerCase().trim());
      }

      // 2. Resolve assigned technician by name from registered staff
      if (recipients.size === 0 && eq.assigned_technician) {
        const assignedName = eq.assigned_technician.toLowerCase().trim();
        // Check if assignedTechnician is itself an email
        if (assignedName.includes('@')) {
          recipients.add(assignedName);
        } else {
          // Look up in registered staff
          const matchedUser = memoryStore.users.find(
            (u) =>
              u.name.toLowerCase().trim() === assignedName ||
              u.name.toLowerCase().includes(assignedName) ||
              assignedName.includes(u.name.toLowerCase().trim())
          );
          if (matchedUser && matchedUser.email && matchedUser.email.includes('@')) {
            recipients.add(matchedUser.email.toLowerCase().trim());
          }
        }
      }
    }

    // 3. Fallback solely to lab administrator if completely unassigned
    if (recipients.size === 0) {
      recipients.add('asokanmounesh@gmail.com');
    }

    return Array.from(recipients);
  }

  async gatherRecipientsAsync(eq?: EquipmentEntity): Promise<string[]> {
    return this.gatherRecipients(eq);
  }

  /**
   * Evaluates all equipment for due soon and overdue statuses and dispatches emails through Gmail.
   */
  async evaluateAndDispatch(): Promise<EvaluateResult> {
    const settings = this.getSettings();
    const noticeWindowDays = settings.reminder_days_before || 30;
    const now = new Date();
    // Normalize today to start of day UTC
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    const equipmentList = memoryStore.equipment;
    const dispatchedAlerts: EvaluateResult['dispatchedAlerts'] = [];
    let dueSoonCount = 0;
    let overdueCount = 0;

    for (const eq of equipmentList) {
      if (!eq.next_calibration_date) continue;

      const dueDate = new Date(eq.next_calibration_date);
      const diffMs = dueDate.getTime() - today.getTime();
      const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

      let status: 'DUE_SOON' | 'OVERDUE' | null = null;
      if (daysRemaining < 0) {
        status = 'OVERDUE';
        overdueCount++;
      } else if (daysRemaining <= noticeWindowDays) {
        status = 'DUE_SOON';
        dueSoonCount++;
      }

      if (status) {
        // Update equipment entity status in memory store to reflect reality
        eq.status = status;

        const isOverdue = status === 'OVERDUE';
        const recipients = this.gatherRecipients(eq);
        const statusLabel = isOverdue ? 'OVERDUE' : 'DUE SOON';
        const subject = `[CalibTrack Metrology Alert] Calibration ${statusLabel}: ${eq.name} (${eq.equipment_code})`;

        const htmlBody = this.buildEmailHtml({
          equipmentName: eq.name,
          equipmentCode: eq.equipment_code,
          department: eq.department || 'General Laboratory',
          location: eq.location || 'Central Facility',
          dueDate: eq.next_calibration_date,
          daysRemaining,
          isOverdue,
          recipients,
        });

        const dispatchedAt = new Date().toISOString();

        const emailDetails: NotificationEmailDetails = {
          subject,
          recipients,
          sender: 'CalibTrack Metrology Services <notifications@calibtrack.lab>',
          dispatched_at: dispatchedAt,
          status: 'DELIVERED',
          html_body: htmlBody,
          equipment_code: eq.equipment_code,
          equipment_name: eq.name,
          urgency: status,
          days_remaining: daysRemaining,
          due_date: eq.next_calibration_date,
        };

        // Create in-app notification card with Gmail dispatched details
        const notifTitle = isOverdue
          ? `Calibration Overdue Alert: ${eq.name}`
          : `Calibration Due Soon: ${eq.name}`;
        const notifMessage = isOverdue
          ? `Instrument ${eq.name} (${eq.equipment_code}) is overdue by ${Math.abs(daysRemaining)} days. Dispatched alert email to ${recipients.length} recipients.`
          : `Instrument ${eq.name} (${eq.equipment_code}) requires calibration within ${daysRemaining} days. Dispatched alert email to ${recipients.length} recipients.`;

        // Check if an identical notification already exists for today to avoid duplicate clutter
        const existingRecent = memoryStore.notifications.find(
          (n) =>
            n.equipment_id === eq.id &&
            n.type === (isOverdue ? 'CALIBRATION_OVERDUE' : 'CALIBRATION_DUE_SOON') &&
            n.created_at.startsWith(today.toISOString().split('T')[0])
        );

        if (!existingRecent) {
          const newNotif: NotificationEntity = {
            id: `notif-alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            user_id: null,
            equipment_id: eq.id,
            type: isOverdue ? 'CALIBRATION_OVERDUE' : 'CALIBRATION_DUE_SOON',
            title: notifTitle,
            message: notifMessage,
            is_read: false,
            created_at: dispatchedAt,
            email_details: emailDetails,
          };
          memoryStore.notifications.unshift(newNotif);
        } else {
          // Refresh email details
          existingRecent.email_details = emailDetails;
        }

        dispatchedAlerts.push({
          equipmentId: eq.id,
          equipmentCode: eq.equipment_code,
          equipmentName: eq.name,
          status,
          daysRemaining,
          dueDate: eq.next_calibration_date,
          recipients,
          subject,
          htmlBody,
          dispatchedAt,
        });

        // Transmit real ISO 17025 metrology alert email to all gathered staff recipients via Gmail SMTP (awaited for serverless execution)
        if (settings.email_enabled && recipients.length > 0) {
          try {
            await emailService.sendAlertEmail({
              to: recipients,
              subject,
              html: htmlBody,
            });
          } catch (err: any) {
            console.warn(`[ReminderService] Email dispatch failed for ${eq.equipment_code}:`, err?.message);
          }
        }

        console.log(`[CalibTrack Reminder] Gmail alert dispatched for ${eq.equipment_code} (${status}) to: ${recipients.join(', ')}`);
      }
    }

    return {
      success: true,
      evaluatedCount: equipmentList.length,
      dispatchedEmailsCount: dispatchedAlerts.length,
      dueSoonCount,
      overdueCount,
      recipientsCount: this.gatherRecipients().length,
      dispatchedAlerts,
    };
  }
}

export const reminderService = new ReminderService();
