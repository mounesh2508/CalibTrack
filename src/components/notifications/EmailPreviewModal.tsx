import React, { useState } from 'react';
import {
  Mail,
  X,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  ExternalLink,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { DispatchedEmailDetails } from '../../types';

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  emailDetails: DispatchedEmailDetails | null;
  onNavigateToEquipment?: (equipmentId: string) => void;
  equipmentId?: string;
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  isOpen,
  onClose,
  emailDetails,
  onNavigateToEquipment,
  equipmentId,
}) => {
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');

  if (!isOpen || !emailDetails) return null;

  const handleCopySubject = () => {
    navigator.clipboard.writeText(emailDetails.subject);
    setCopiedSubject(true);
    setTimeout(() => setCopiedSubject(false), 2000);
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(emailDetails.htmlBody);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const isOverdue = emailDetails.urgency === 'OVERDUE';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Dispatched Calibration Alert</h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  Gmail Dispatched
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    isOverdue
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {emailDetails.urgency}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sent to assigned laboratory technician and compliance administrators
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Email Metadata Envelope Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-white text-xs space-y-2.5">
          <div className="grid grid-cols-[60px_1fr] items-start gap-2">
            <span className="font-semibold text-slate-400">From:</span>
            <div className="flex items-center gap-1.5 text-slate-800 font-medium font-mono text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{emailDetails.sender}</span>
            </div>
          </div>

          <div className="grid grid-cols-[60px_1fr] items-start gap-2">
            <span className="font-semibold text-slate-400">To:</span>
            <div className="flex flex-wrap gap-1.5">
              {emailDetails.recipients.map((recipient, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono text-[11px] border border-slate-200"
                >
                  <UserCheck className="w-3 h-3 text-slate-500" />
                  {recipient}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[60px_1fr] items-baseline gap-2">
            <span className="font-semibold text-slate-400">Subject:</span>
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-900 text-xs sm:text-[13px]">{emailDetails.subject}</span>
              <button
                type="button"
                onClick={handleCopySubject}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 cursor-pointer shrink-0"
              >
                {copiedSubject ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copiedSubject ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[60px_1fr] items-center gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span className="font-semibold text-slate-400">Time:</span>
            <div className="flex items-center justify-between">
              <span>{new Date(emailDetails.dispatchedAt).toLocaleString()}</span>
              {equipmentId && onNavigateToEquipment && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToEquipment(equipmentId);
                  }}
                  className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Asset Details</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* View Toggle Tabs */}
        <div className="px-5 pt-3 pb-1 flex items-center justify-between bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('formatted')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                viewMode === 'formatted'
                  ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Email Preview
            </button>
            <button
              type="button"
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                viewMode === 'raw'
                  ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Raw HTML Code
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyHtml}
            className="text-[11px] text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 font-medium cursor-pointer"
          >
            {copiedHtml ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            {copiedHtml ? 'Copied HTML' : 'Copy HTML'}
          </button>
        </div>

        {/* Modal Body / Email Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-slate-100/50">
          {viewMode === 'formatted' ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div
                className="email-preview-content p-4 sm:p-6"
                dangerouslySetInnerHTML={{ __html: emailDetails.htmlBody }}
              />
            </div>
          ) : (
            <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[380px]">
              {emailDetails.htmlBody}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200/80 bg-white flex items-center justify-between">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Gmail API Delivery Status: 200 OK (Delivered to Recipients)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
