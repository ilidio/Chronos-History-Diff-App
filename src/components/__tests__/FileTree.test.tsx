import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FileTree from '../FileTree';
import React from 'react';

describe('FileTree', () => {
  const files = [
    { path: 'src/app/page.tsx', status: 'Modified' },
    { path: 'src/components/FileTree.tsx', status: 'Staged' },
    { path: 'README.md', status: 'Untracked' },
  ];

  it('renders file tree correctly', () => {
    render(
      <FileTree 
        files={files} 
        selectedFile={null} 
        onFileClick={vi.fn()} 
        viewMode="workdir" 
      />
    );
    
    expect(screen.getByText('src')).toBeInTheDocument();
    expect(screen.getByText('app')).toBeInTheDocument();
    expect(screen.getByText('page.tsx')).toBeInTheDocument();
    expect(screen.getByText('FileTree.tsx')).toBeInTheDocument();
    expect(screen.getByText('README.md')).toBeInTheDocument();
  });

  it('calls onFileClick when a file is clicked', () => {
    const onFileClick = vi.fn();
    render(
      <FileTree 
        files={files} 
        selectedFile={null} 
        onFileClick={onFileClick} 
        viewMode="workdir" 
      />
    );
    
    fireEvent.click(screen.getByText('README.md'));
    expect(onFileClick).toHaveBeenCalledWith('README.md');
  });

  it('calls onToggleStage when checkbox is clicked', () => {
    const onToggleStage = vi.fn();
    render(
      <FileTree 
        files={files} 
        selectedFile={null} 
        onFileClick={vi.fn()} 
        onToggleStage={onToggleStage}
        viewMode="workdir" 
      />
    );
    
    // Find checkbox by its role
    const checkboxes = screen.getAllByRole('checkbox');
    // Click the first one (should be one of the files)
    fireEvent.click(checkboxes[0]);
    
    expect(onToggleStage).toHaveBeenCalled();
  });
});
