/**
 * SearchFilters Component
 * VBT-242: Search UI Components Structure
 *
 * Filter popover for date range and model selection
 */

import { useState } from 'react';
import { Filter, X, Calendar as CalendarIcon } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { SearchFiltersProps, DateRangeFilter } from './types';
import { AVAILABLE_MODELS, DATE_RANGE_PRESETS } from './types';

export function SearchFilters({
  filters,
  onChange,
  onClear,
  availableModels = AVAILABLE_MODELS.map((m) => m.value),
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [datePreset, setDatePreset] = useState<string>('custom');

  // Count active filters
  const activeFilterCount =
    (filters.dateRange?.from || filters.dateRange?.to ? 1 : 0) +
    (filters.model ? 1 : 0);

  // Handle date range preset selection
  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);

    const today = new Date();
    let dateRange: DateRangeFilter | undefined;

    switch (preset) {
      case 'today':
        dateRange = {
          from: format(today, 'yyyy-MM-dd'),
          to: format(today, 'yyyy-MM-dd'),
        };
        break;
      case 'week':
        dateRange = {
          from: format(subDays(today, 7), 'yyyy-MM-dd'),
          to: format(today, 'yyyy-MM-dd'),
        };
        break;
      case 'month':
        dateRange = {
          from: format(subDays(today, 30), 'yyyy-MM-dd'),
          to: format(today, 'yyyy-MM-dd'),
        };
        break;
      case 'custom':
        dateRange = filters.dateRange;
        break;
    }

    onChange({
      ...filters,
      dateRange,
    });
  };

  // Handle custom date selection
  const handleDateSelect = (date: Date | undefined, type: 'from' | 'to') => {
    if (!date) return;

    const newDateRange: DateRangeFilter = {
      ...filters.dateRange,
      [type]: format(date, 'yyyy-MM-dd'),
    };

    onChange({
      ...filters,
      dateRange: newDateRange,
    });
    setDatePreset('custom');
  };

  // Handle model filter toggle
  const handleModelToggle = (modelValue: string) => {
    onChange({
      ...filters,
      model: filters.model === modelValue ? undefined : modelValue,
    });
  };

  // Clear date range
  const clearDateRange = () => {
    onChange({
      ...filters,
      dateRange: undefined,
    });
    setDatePreset('custom');
  };

  // Clear model filter
  const clearModel = () => {
    onChange({
      ...filters,
      model: undefined,
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'gap-2 relative',
            activeFilterCount > 0 && 'border-primary'
          )}
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge
              variant="default"
              className="h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full absolute -top-1.5 -right-1.5"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Filters</h4>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClear();
                  setDatePreset('custom');
                }}
                className="h-7 text-xs"
              >
                Clear all
              </Button>
            )}
          </div>

          <Separator />

          {/* Date Range Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Date Range</Label>
              {filters.dateRange && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDateRange}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Date Presets */}
            <div className="grid grid-cols-2 gap-2">
              {DATE_RANGE_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={datePreset === preset.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePresetChange(preset.value)}
                  className="text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Custom Date Pickers (shown when custom is selected) */}
            {datePreset === 'custom' && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateRange?.from
                          ? format(new Date(filters.dateRange.from), 'PPP')
                          : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          filters.dateRange?.from
                            ? new Date(filters.dateRange.from)
                            : undefined
                        }
                        onSelect={(date) => handleDateSelect(date, 'from')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateRange?.to
                          ? format(new Date(filters.dateRange.to), 'PPP')
                          : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          filters.dateRange?.to
                            ? new Date(filters.dateRange.to)
                            : undefined
                        }
                        onSelect={(date) => handleDateSelect(date, 'to')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Model Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">AI Model</Label>
              {filters.model && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearModel}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {AVAILABLE_MODELS.filter((model) =>
                availableModels.includes(model.value)
              ).map((model) => (
                <div key={model.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={model.value}
                    checked={filters.model === model.value}
                    onCheckedChange={() => handleModelToggle(model.value)}
                  />
                  <Label
                    htmlFor={model.value}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {model.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
