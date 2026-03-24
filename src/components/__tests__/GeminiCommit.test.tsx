import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Home from '@/app/page';
import React from 'react';

// Mock the electron lib
vi.mock('@/lib/electron', () => ({
  getRepoStatus: vi.fn().mockResolvedValue({ files: [] }),
  getLog: vi.fn().mockResolvedValue([]),
  getBranches: vi.fn().mockResolvedValue([]),
  readChronosHistoryIndex: vi.fn().mockResolvedValue({ snapshots: [] }),
  readAllFiles: vi.fn().mockResolvedValue([]),
  onMenuOpenFolder: vi.fn().mockReturnValue(vi.fn()),
  onMenuOpenFile: vi.fn().mockReturnValue(vi.fn()),
  addToRecentFile: vi.fn(),
  lsFiles: vi.fn().mockResolvedValue(''),
}));

// Mock the dialog component to check if it opens
vi.mock('@/components/DailyBriefDialog', () => ({
    default: ({ open }: { open: boolean }) => open ? <div data-testid="daily-brief-dialog">Daily Briefing</div> : null
}));

describe('AI Daily Briefing', () => {
  beforeEach(() => {
    // Mock localStorage
    const mockLocalStorage: Record<string, string> = {
        'ai_api_key': 'fake-key',
    };
    global.localStorage = {
      getItem: vi.fn((key) => mockLocalStorage[key] || null),
      setItem: vi.fn((key, value) => { mockLocalStorage[key] = value }),
      removeItem: vi.fn((key) => { delete mockLocalStorage[key] }),
      clear: vi.fn(() => { for (const key in mockLocalStorage) delete mockLocalStorage[key] }),
      length: Object.keys(mockLocalStorage).length,
      key: vi.fn((index) => Object.keys(mockLocalStorage)[index] || null),
    } as any;
  });

  it('opens DailyBriefDialog when the briefing button is clicked', () => {
    render(<Home />);
    
    const briefingButton = screen.getByTitle('Daily Progress Briefing');
    expect(briefingButton).toBeInTheDocument();

    fireEvent.click(briefingButton);
    
    expect(screen.getByTestId('daily-brief-dialog')).toBeInTheDocument();
  });
});
