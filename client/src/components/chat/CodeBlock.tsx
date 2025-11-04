import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface CodeBlockProps {
  language?: string;
  children: string;
}

export function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Detect language from className (e.g., "language-javascript")
  const lang = language?.replace('language-', '') || 'text';

  return (
    <div className="relative group my-2">
      {/* Language Label & Copy Button */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-b border-gray-700 rounded-t-lg">
        <span className="text-xs text-gray-400 font-mono uppercase">{lang}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              <span className="text-xs">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              <span className="text-xs">Copy</span>
            </>
          )}
        </Button>
      </div>

      {/* Code Content */}
      <SyntaxHighlighter
        language={lang}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          borderRadius: '0 0 0.5rem 0.5rem',
          padding: '1rem',
          fontSize: '0.875rem',
        }}
        showLineNumbers
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}
