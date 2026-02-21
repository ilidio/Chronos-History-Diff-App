import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Home from '@/app/page';
import React from 'react';

// Mock the electron lib
vi.mock('@/lib/electron', () => ({
  getRepoStatus: vi.fn().mockResolvedValue({ files: [] }),
  getLog: vi.fn().mockResolvedValue([]),
  getBranches: vi.fn().mockResolvedValue([]),
  getStashes: vi.fn().mockResolvedValue([]),
  getTags: vi.fn().mockResolvedValue(''),
  generateAICommitMessage: vi.fn().mockResolvedValue('feat: implementation of tests'),
  reviewChanges: vi.fn().mockResolvedValue('AI Review Result'),
  getDiffFile: vi.fn().mockResolvedValue('fake diff content'),
  getConfig: vi.fn().mockResolvedValue(''),
  getCustomGraph: vi.fn().mockResolvedValue(''),
}));

describe('Gemini AI Commit Message', () => {
  beforeEach(() => {
    // Mock localStorage
    const mockLocalStorage: Record<string, string> = {
        'ai_api_key': 'fake-key',
        'ai_provider': 'gemini',
        'ai_model': 'gemini-3-flash-preview'
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

  it('calls generateAICommitMessage and updates textarea', async () => {
    const { generateAICommitMessage } = await import('@/lib/electron');
    
    render(<Home />);
    
    // Check if the AI button is present
    const aiButton = screen.getByTitle('Generate Commit Message with AI');
    expect(aiButton).toBeInTheDocument();

    // Trigger click
    fireEvent.click(aiButton);
    
    await waitFor(() => {
      expect(generateAICommitMessage).toHaveBeenCalled();
    });

    const textarea = screen.getByPlaceholderText('Commit message...');
    expect(textarea).toHaveValue('feat: implementation of tests');
  });

  it('calls reviewChanges and opens ReviewDialog', async () => {
    const { reviewChanges } = await import('@/lib/electron');
    (reviewChanges as any).mockResolvedValue('AI Review Result');

    render(<Home />);
    
    // Find the Review button (Shield icon)
    const reviewButton = screen.getByTitle('AI Code Review');
    expect(reviewButton).toBeInTheDocument();

    // Trigger click
    fireEvent.click(reviewButton);
    
    await waitFor(() => {
      expect(reviewChanges).toHaveBeenCalled();
    });

    // Check if dialog content appears
    expect(screen.getByText(/AI Review Result/i)).toBeInTheDocument();
  });
});
