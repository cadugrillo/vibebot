import { MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: 'message' | 'sparkles';
  showCTA?: boolean;
  ctaText?: string;
  onCtaClick?: () => void;
}

export function EmptyState({
  title = 'Start a new conversation',
  description = 'Ask me anything, and I\'ll do my best to help you.',
  icon = 'sparkles',
  showCTA = true,
  ctaText = 'New Chat',
  onCtaClick,
}: EmptyStateProps) {
  const IconComponent = icon === 'sparkles' ? Sparkles : MessageSquare;

  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full" />
            <div className="relative bg-primary/5 p-6 rounded-full">
              <IconComponent className="h-12 w-12 text-primary" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-semibold mb-3">{title}</h2>

        {/* Description */}
        <p className="text-muted-foreground mb-8 leading-relaxed">
          {description}
        </p>

        {/* CTA Button */}
        {showCTA && onCtaClick && (
          <Button
            onClick={onCtaClick}
            size="lg"
            className="min-w-[180px]"
          >
            {ctaText}
          </Button>
        )}

        {/* Suggestion Cards (Optional) */}
        <div className="mt-12 grid gap-3">
          <SuggestionCard
            title="Creative Writing"
            description="Help me write a story or poem"
          />
          <SuggestionCard
            title="Code Assistant"
            description="Debug code or explain concepts"
          />
          <SuggestionCard
            title="General Knowledge"
            description="Answer questions on any topic"
          />
        </div>
      </div>
    </div>
  );
}

interface SuggestionCardProps {
  title: string;
  description: string;
  onClick?: () => void;
}

function SuggestionCard({ title, description, onClick }: SuggestionCardProps) {
  return (
    <Card
      className="p-4 text-left cursor-pointer hover:bg-accent transition-colors group"
      onClick={onClick}
    >
      <h3 className="text-sm font-medium mb-1 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </Card>
  );
}
