import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { InteractiveTerminalGraph } from '@/app/page';
import React from 'react';

// Mock Ansi component
vi.mock('ansi-to-react', () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>
}));

describe('InteractiveTerminalGraph', () => {
  it('renders graph content and identifies SHAs', () => {
    const content = '* 56afa3c feat: support Google Gemini API\n* 2dd9b16 feat(history): Display commit details';
    const onCommitSelect = vi.fn();
    
    render(<InteractiveTerminalGraph content={content} onCommitSelect={onCommitSelect} />);
    
    expect(screen.getByText(/56afa3c/)).toBeInTheDocument();
    expect(screen.getByText(/2dd9b16/)).toBeInTheDocument();
  });

  it('calls onCommitSelect when a commit line is clicked', () => {
    const content = '* 56afa3c feat: support Google Gemini API';
    const onCommitSelect = vi.fn();
    
    render(<InteractiveTerminalGraph content={content} onCommitSelect={onCommitSelect} />);
    
    const commitLine = screen.getByText(/56afa3c/).closest('div');
    if (commitLine) fireEvent.click(commitLine);
    
    expect(onCommitSelect).toHaveBeenCalledWith('56afa3c');
  });

  it('renders CI status icons when provided', () => {
    const content = '* 56afa3c feat: support Google Gemini API\n* 2dd9b16 feat(history): Display commit details';
    const commitStatuses = {
      '56afa3c': 'success',
      '2dd9b16': 'failure'
    };
    
    render(<InteractiveTerminalGraph content={content} onCommitSelect={vi.fn()} commitStatuses={commitStatuses} />);
    
    expect(screen.getByTitle('CI Passed')).toBeInTheDocument();
    expect(screen.getByTitle('CI Failed')).toBeInTheDocument();
  });

  it('handles empty content gracefully', () => {
    render(<InteractiveTerminalGraph content="" onCommitSelect={vi.fn()} />);
    expect(screen.getByText('No graph')).toBeInTheDocument();
  });
});