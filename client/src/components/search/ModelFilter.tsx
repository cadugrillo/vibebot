/**
 * ModelFilter Component
 * VBT-247: Model Filter Component
 *
 * Allows users to filter search results by AI model
 */

import { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { AVAILABLE_MODELS } from './types';

interface ModelFilterProps {
  /**
   * Currently selected model (single select)
   */
  value?: string;

  /**
   * Callback when model selection changes
   */
  onChange: (model: string | undefined) => void;

  /**
   * Disabled state
   */
  disabled?: boolean;
}

/**
 * Get model label from value
 */
function getModelLabel(value: string): string {
  const model = AVAILABLE_MODELS.find((m) => m.value === value);
  return model ? model.label : value;
}

/**
 * ModelFilter Component
 */
export function ModelFilter({ value, onChange, disabled = false }: ModelFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Handle model selection toggle
   */
  const handleModelToggle = (modelValue: string) => {
    if (value === modelValue) {
      // Deselect if clicking the same model
      onChange(undefined);
    } else {
      // Select the new model
      onChange(modelValue);
    }
  };

  /**
   * Clear model filter
   */
  const handleClear = () => {
    onChange(undefined);
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={value ? 'secondary' : 'outline'}
            className={cn(
              'justify-between text-left font-normal min-w-[180px]',
              !value && 'text-muted-foreground'
            )}
            disabled={disabled}
          >
            <span className="truncate">
              {value ? getModelLabel(value) : 'Filter by model'}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 opacity-50 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          <DropdownMenuLabel>AI Models</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {AVAILABLE_MODELS.map((model) => (
            <DropdownMenuCheckboxItem
              key={model.value}
              checked={value === model.value}
              onCheckedChange={() => handleModelToggle(model.value)}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <span>{model.label}</span>
                {value === model.value && (
                  <Check className="h-4 w-4 ml-2 flex-shrink-0" />
                )}
              </div>
            </DropdownMenuCheckboxItem>
          ))}
          {value && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => {
                    handleClear();
                    setIsOpen(false);
                  }}
                >
                  Clear filter
                </Button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Filter chip - shown when model is selected */}
      {value && (
        <Badge
          variant="secondary"
          className="gap-1 pr-1 cursor-pointer hover:bg-destructive/10"
          onClick={handleClear}
        >
          {getModelLabel(value)}
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
