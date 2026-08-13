import { useState } from 'react';
import { cn } from '../../lib/cn';

export default function CopyButton({ text, className, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'text-xs font-medium px-2.5 py-1 rounded-lg transition-colors shrink-0',
        copied
          ? 'bg-success/20 text-success'
          : 'text-muted hover:text-white hover:bg-white/10',
        className
      )}
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}
