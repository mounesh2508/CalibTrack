import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { StatusBadge } from '../components/common/StatusBadge';
import { CalendarEvent } from '../types';

interface CalendarPageProps {
  calendarEvents: CalendarEvent[];
  onNavigate: (path: string) => void;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({
  calendarEvents,
  onNavigate,
}) => {
  // Current view year & month: October 2026 (matching system date context)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(9); // 0-indexed: 9 = October
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Helpers for calendar grid calculation
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentYear(2026);
    setCurrentMonth(9); // October
  };

  // Get events on a specific day (1 to daysInMonth)
  const getEventsForDay = (day: number) => {
    const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
      day
    ).padStart(2, '0')}`;
    return calendarEvents.filter((e) => e.date === formattedDate);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Calibration Calendar
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Schedule and track laboratory calibration milestones and engineer visits.
          </p>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-2xs">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-l-lg transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-semibold text-slate-800 min-w-36 text-center">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-r-lg transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white px-4 py-2.5 rounded-xl border border-slate-200/90 shadow-2xs text-xs">
        <span className="font-medium text-slate-500">Event Classifications:</span>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
            <span className="text-slate-600">Overdue Event</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
            <span className="text-slate-600">Due Soon (Next 30 Days)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
            <span className="text-slate-600">Scheduled / Upcoming</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span className="text-slate-600">Completed This Month</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 bg-slate-50/80 border-b border-slate-200 text-center text-xs font-semibold text-slate-600 py-2.5">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-24 sm:min-h-28 bg-slate-50/40 p-1.5" />
          ))}

          {/* Days of Month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const events = getEventsForDay(dayNum);
            const isToday = currentYear === 2026 && currentMonth === 9 && dayNum === 8;

            return (
              <div
                key={`day-${dayNum}`}
                className={`min-h-24 sm:min-h-28 p-1.5 sm:p-2 transition-colors ${
                  isToday ? 'bg-blue-50/20 ring-1 ring-inset ring-blue-400' : 'hover:bg-slate-50/50'
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center ${
                      isToday
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-700'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {events.length > 0 && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {events.length} event{events.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Day Events Stack */}
                <div className="space-y-1">
                  {events.map((evt, evtIdx) => {
                    let badgeClass = 'bg-sky-50 text-sky-800 border-sky-200 hover:border-sky-300';
                    let dotClass = 'bg-sky-500';

                    if (evt.type === 'overdue') {
                      badgeClass = 'bg-rose-50 text-rose-800 border-rose-200 hover:border-rose-300';
                      dotClass = 'bg-rose-500';
                    } else if (evt.type === 'due_soon') {
                      badgeClass = 'bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-300';
                      dotClass = 'bg-amber-500';
                    } else if (evt.type === 'completed') {
                      badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-emerald-300';
                      dotClass = 'bg-emerald-500';
                    }

                    return (
                      <button
                        key={evt.id ? `${evt.id}-${evtIdx}` : `evt-${evtIdx}`}
                        onClick={() => setSelectedEvent(evt)}
                        className={`w-full text-left p-1.5 rounded-md border text-[11px] font-medium transition-all shadow-2xs flex items-center gap-1.5 truncate cursor-pointer ${badgeClass}`}
                        title={`${evt.equipmentName} - ${evt.time || ''}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
                        <span className="truncate">{evt.equipmentName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <Modal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title="Calibration Schedule Detail"
          subtitle={`Event Reference #${selectedEvent.id}`}
          maxWidth="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedEvent(null);
                  onNavigate(`/equipment/${selectedEvent.equipmentId}`);
                }}
                icon={<ExternalLink className="w-3.5 h-3.5" />}
              >
                View Equipment
              </Button>
              <Button variant="primary" size="sm" onClick={() => setSelectedEvent(null)}>
                Done
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Instrument:</span>
                <span className="font-semibold text-slate-900">{selectedEvent.equipmentName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Asset Tag:</span>
                <span className="font-mono text-blue-600 font-semibold">{selectedEvent.equipmentCode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Scheduled Date:</span>
                <span className="font-medium text-slate-800">{selectedEvent.date}</span>
              </div>
              {selectedEvent.time && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Time Window:</span>
                  <span className="font-medium text-slate-800">{selectedEvent.time}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2.5 text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block text-[11px]">Location</span>
                  <span>{selectedEvent.location}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-slate-600 pt-2 border-t border-slate-100">
                <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block text-[11px]">Assigned Metrology Agency</span>
                  <span>{selectedEvent.provider}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-slate-500">Operational Priority:</span>
              <StatusBadge
                status={
                  selectedEvent.type === 'overdue'
                    ? 'Overdue'
                    : selectedEvent.type === 'due_soon'
                    ? 'Due Soon'
                    : selectedEvent.type === 'completed'
                    ? 'Completed'
                    : 'Scheduled'
                }
                size="sm"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
