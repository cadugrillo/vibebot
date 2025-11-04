import { ThemeToggle } from '@/components/ThemeToggle';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      {/* Theme toggle in top-right corner for testing */}
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">VibeBot</h1>
        <p className="text-muted-foreground">Self-hosted multi-user AI Agent application</p>
      </div>
    </div>
  );
}
