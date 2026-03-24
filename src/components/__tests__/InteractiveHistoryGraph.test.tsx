import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InteractiveHistoryGraph from '../InteractiveHistoryGraph';
import React from 'react';

// Mock Gitgraph
vi.mock('@gitgraph/react', () => ({
  Gitgraph: ({ children }: { children: (gitgraph: any) => void }) => {
    const gitgraph = {
      branch: vi.fn().mockReturnValue({
        commit: vi.fn(),
      }),
    };
    return <div data-testid="gitgraph">{children(gitgraph)}</div>;
  },
  Orientation: { VerticalReverse: 'VerticalReverse' },
  TemplateName: { Metro: 'Metro' },
}));

describe('InteractiveHistoryGraph', () => {
  it('renders "No history" message when lists are empty', () => {
    render(
      <InteractiveHistoryGraph 
        gitHistory={[]} 
        localHistory={[]} 
        onCommitClick={vi.fn()} 
        onSnapshotClick={vi.fn()} 
        selectedId={null} 
      />
    );
    expect(screen.getByText('No history to visualize yet.')).toBeInTheDocument();
  });

  it('renders the graph container when history is provided', () => {
    const gitHistory = [{ id: '123', date: new Date().toISOString(), author: 'Test', message: 'Commit 1' }];
    render(
      <InteractiveHistoryGraph 
        gitHistory={gitHistory} 
        localHistory={[]} 
        onCommitClick={vi.fn()} 
        onSnapshotClick={vi.fn()} 
        selectedId={null} 
      />
    );
    expect(screen.getByTestId('gitgraph')).toBeInTheDocument();
  });
});
