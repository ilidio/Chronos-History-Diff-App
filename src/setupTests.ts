import '@testing-library/jest-dom';
import { vi } from 'vitest';

const mockIpcRenderer = {
  on: vi.fn(),
  send: vi.fn(),
  invoke: vi.fn(),
  removeAllListeners: vi.fn(),
};

// Mock document.queryCommandSupported for Monaco Editor
if (typeof document !== 'undefined' && !document.queryCommandSupported) {
  document.queryCommandSupported = vi.fn().mockReturnValue(true);
}

// Mock Electron IPC
if (typeof window !== 'undefined') {
  (window as any).require = (module: string) => {
    if (module === 'electron') {
      return {
        ipcRenderer: mockIpcRenderer,
      };
    }
    return {};
  };
}