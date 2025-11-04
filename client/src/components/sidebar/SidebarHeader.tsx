import { MessageSquare } from 'lucide-react';

export function SidebarHeader() {
  return (
    <div className="flex items-center gap-2">
      <MessageSquare className="h-5 w-5 text-primary" />
      <h1 className="text-lg font-semibold">VibeBot</h1>
    </div>
  );
}
