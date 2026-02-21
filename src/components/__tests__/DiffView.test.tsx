import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DiffView from '../DiffView';
import React from 'react';

// Mock monaco-editor module
vi.mock('monaco-editor', () => ({
  default: {},
  editor: {},
  languages: {}
}));

// Mock @monaco-editor/react
vi.mock('@monaco-editor/react', () => ({
  DiffEditor: vi.fn(({ original, modified }) => <div data-testid="monaco-diff-editor">{modified}</div>),
  loader: {
    config: vi.fn(),
    init: vi.fn(() => Promise.resolve()),
  }
}));

describe('DiffView', () => {
  it('renders loading state initially', () => {
    render(<DiffView original="" modified="" />);
    expect(screen.getByText('Initializing editor...')).toBeInTheDocument();
  });

  it('renders merge conflict warning when conflicts detected', async () => {
    const original = 'base content';
    const modified = `<<<<<<< HEAD
my change
=======
their change
>>>>>>> other`;
    
    render(<DiffView original={original} modified={modified} />);
    
    // Wait for the component to finish loading and debounce
    await waitFor(() => {
      expect(screen.queryByText('Loading diff...')).not.toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByText(/Merge Conflicts Detected/i)).toBeInTheDocument();
    expect(screen.getByTestId('monaco-diff-editor')).toBeInTheDocument();
  });
});
