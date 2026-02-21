import React from 'react';
import { Loader2 } from 'lucide-react';

interface GlobalLoaderProps {
  isVisible: boolean;
  message?: string;
}

export default function GlobalLoader({ isVisible, message = 'Loading...' }: GlobalLoaderProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 p-6 rounded-lg bg-card border shadow-lg">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
}
