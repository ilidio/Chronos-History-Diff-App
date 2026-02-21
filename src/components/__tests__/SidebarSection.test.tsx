import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SidebarSection from '../SidebarSection';
import React from 'react';

describe('SidebarSection', () => {
  it('renders title and children when open', () => {
    render(
      <SidebarSection title="Local Branches">
        <div>branch-1</div>
      </SidebarSection>
    );
    
    expect(screen.getByText('Local Branches')).toBeInTheDocument();
    expect(screen.getByText('branch-1')).toBeInTheDocument();
  });

  it('hides children when toggled closed', () => {
    render(
      <SidebarSection title="Local Branches">
        <div>branch-1</div>
      </SidebarSection>
    );
    
    const button = screen.getByText('Local Branches');
    fireEvent.click(button);
    
    expect(screen.queryByText('branch-1')).not.toBeInTheDocument();
  });

  it('renders action when provided', () => {
    const action = <button data-testid="test-action">Add</button>;
    render(
      <SidebarSection title="Local Branches" action={action}>
        <div>branch-1</div>
      </SidebarSection>
    );
    
    expect(screen.getByTestId('test-action')).toBeInTheDocument();
  });
});
