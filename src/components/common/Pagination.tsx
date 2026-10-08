import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  className = '',
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3.5 bg-white border-t border-slate-200/80 text-xs text-slate-500 ${className}`}>
      <div>
        Showing <span className="font-medium text-slate-900">{startItem}</span> to{' '}
        <span className="font-medium text-slate-900">{endItem}</span> of{' '}
        <span className="font-medium text-slate-900">{totalItems}</span> equipment items
      </div>

      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        <Button
          variant="outline"
          size="xs"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          icon={<ChevronLeft className="w-3.5 h-3.5" />}
        >
          Previous
        </Button>

        <div className="flex items-center px-2 text-xs font-medium text-slate-700">
          Page {currentPage} of {Math.max(1, totalPages)}
        </div>

        <Button
          variant="outline"
          size="xs"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          icon={<ChevronRight className="w-3.5 h-3.5" />}
          iconPosition="right"
        >
          Next
        </Button>
      </div>
    </div>
  );
};
