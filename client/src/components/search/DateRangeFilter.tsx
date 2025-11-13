/**
 * DateRangeFilter Component
 * VBT-246: Date Range Filter Component
 *
 * Allows users to filter search results by date range
 * with preset options or custom date selection
 */

import { useState } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DateRangeFilter as DateRange } from './types';

/**
 * Date range preset options
 */
const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: 'week' },
  { label: 'Last 30 days', value: 'month' },
  { label: 'Custom', value: 'custom' },
] as const;

type DatePreset = typeof DATE_PRESETS[number]['value'];

interface DateRangeFilterProps {
  /**
   * Current date range filter
   */
  value?: DateRange;

  /**
   * Callback when date range changes
   */
  onChange: (dateRange: DateRange | undefined) => void;

  /**
   * Disabled state
   */
  disabled?: boolean;
}

/**
 * Convert preset to actual date range
 */
function presetToDateRange(preset: DatePreset): DateRange {
  const now = new Date();
  const today = startOfDay(now);

  switch (preset) {
    case 'today':
      return {
        from: today.toISOString(),
        to: endOfDay(now).toISOString(),
      };
    case 'week':
      return {
        from: startOfDay(subDays(now, 7)).toISOString(),
        to: endOfDay(now).toISOString(),
      };
    case 'month':
      return {
        from: startOfDay(subDays(now, 30)).toISOString(),
        to: endOfDay(now).toISOString(),
      };
    case 'custom':
      // Custom returns empty range - user will pick dates
      return {};
    default:
      return {};
  }
}

/**
 * Format date range for display
 */
function formatDateRange(dateRange: DateRange): string {
  if (!dateRange.from && !dateRange.to) {
    return 'Select date range';
  }

  if (dateRange.from && dateRange.to) {
    const from = format(new Date(dateRange.from), 'MMM d, yyyy');
    const to = format(new Date(dateRange.to), 'MMM d, yyyy');
    return `${from} - ${to}`;
  }

  if (dateRange.from) {
    return `From ${format(new Date(dateRange.from), 'MMM d, yyyy')}`;
  }

  if (dateRange.to) {
    return `Until ${format(new Date(dateRange.to), 'MMM d, yyyy')}`;
  }

  return 'Select date range';
}

/**
 * DateRangeFilter Component
 */
export function DateRangeFilter({ value, onChange, disabled = false }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DatePreset | null>(null);

  // Calendar state for custom date selection
  const [fromDate, setFromDate] = useState<Date | undefined>(
    value?.from ? new Date(value.from) : undefined
  );
  const [toDate, setToDate] = useState<Date | undefined>(
    value?.to ? new Date(value.to) : undefined
  );

  /**
   * Handle preset selection
   */
  const handlePresetSelect = (preset: DatePreset) => {
    setSelectedPreset(preset);

    if (preset === 'custom') {
      // For custom, clear dates and let user pick
      setFromDate(undefined);
      setToDate(undefined);
      onChange(undefined);
    } else {
      // Apply preset date range
      const dateRange = presetToDateRange(preset);
      setFromDate(dateRange.from ? new Date(dateRange.from) : undefined);
      setToDate(dateRange.to ? new Date(dateRange.to) : undefined);
      onChange(dateRange);
    }
  };

  /**
   * Handle custom date selection
   */
  const handleDateSelect = (date: Date | undefined, type: 'from' | 'to') => {
    if (type === 'from') {
      setFromDate(date);
      // Build date range
      const dateRange: DateRange = {
        from: date ? startOfDay(date).toISOString() : undefined,
        to: toDate ? endOfDay(toDate).toISOString() : undefined,
      };
      onChange(dateRange.from || dateRange.to ? dateRange : undefined);
    } else {
      setToDate(date);
      // Build date range
      const dateRange: DateRange = {
        from: fromDate ? startOfDay(fromDate).toISOString() : undefined,
        to: date ? endOfDay(date).toISOString() : undefined,
      };
      onChange(dateRange.from || dateRange.to ? dateRange : undefined);
    }

    // Switch to custom preset when manually selecting dates
    if (selectedPreset !== 'custom') {
      setSelectedPreset('custom');
    }
  };

  /**
   * Clear date range filter
   */
  const handleClear = () => {
    setFromDate(undefined);
    setToDate(undefined);
    setSelectedPreset(null);
    onChange(undefined);
  };

  /**
   * Check if a date range is selected
   */
  const hasValue = value && (value.from || value.to);

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={hasValue ? 'secondary' : 'outline'}
            className={cn(
              'justify-start text-left font-normal',
              !hasValue && 'text-muted-foreground'
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {hasValue ? formatDateRange(value) : 'Date range'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Presets */}
            <div className="border-r p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Presets
              </p>
              {DATE_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={selectedPreset === preset.value ? 'secondary' : 'ghost'}
                  className="w-full justify-start text-sm"
                  onClick={() => handlePresetSelect(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Calendar(s) */}
            <div className="p-3 space-y-3">
              <div>
                <p className="text-xs font-medium mb-2">From Date</p>
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={(date) => handleDateSelect(date, 'from')}
                  disabled={(date) =>
                    date > new Date() || (toDate ? date > toDate : false)
                  }
                  initialFocus
                />
              </div>
              <div>
                <p className="text-xs font-medium mb-2">To Date</p>
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={(date) => handleDateSelect(date, 'to')}
                  disabled={(date) =>
                    date > new Date() || (fromDate ? date < fromDate : false)
                  }
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear button - shown when date range is selected */}
      {hasValue && (
        <Badge
          variant="secondary"
          className="gap-1 pr-1 cursor-pointer hover:bg-destructive/10"
          onClick={handleClear}
        >
          {selectedPreset && selectedPreset !== 'custom'
            ? DATE_PRESETS.find((p) => p.value === selectedPreset)?.label
            : 'Custom'}
          <button
            className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
    </div>
  );
}
