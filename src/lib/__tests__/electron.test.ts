import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as electron from '../electron';

describe('electron lib wrappers', () => {
  const ipcRenderer = (window as any).require('electron').ipcRenderer;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getLog invokes git:log and parses output', async () => {
    ipcRenderer.invoke.mockResolvedValue('SHA1|Author1|Date1|Msg1|G\nSHA2|Author2|Date2|Msg2|N');
    
    const log = await electron.getLog('/path', 10);
    
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('git:log', { repoPath: '/path', count: 10 });
    expect(log).toHaveLength(2);
    expect(log[0]).toEqual({
      id: 'SHA1',
      author: 'Author1',
      timestamp: 'Date1',
      message: 'Msg1',
      signature: 'G'
    });
  });

  it('getRepoStatus invokes git:status and parses porcelain output', async () => {
    ipcRenderer.invoke.mockResolvedValue('M  staged.txt\n M unstaged.txt\n?? untracked.txt');
    
    const status = await electron.getRepoStatus('/path');
    
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('git:status', '/path');
    expect(status.files).toHaveLength(3);
    expect(status.files[0]).toMatchObject({ path: 'staged.txt', status: 'Staged' });
    expect(status.files[1]).toMatchObject({ path: 'unstaged.txt', status: 'Unstaged' });
    expect(status.files[2]).toMatchObject({ path: 'untracked.txt', status: 'Untracked' });
  });

  it('getBranches invokes git:branches and parses output', async () => {
    ipcRenderer.invoke.mockResolvedValue('SHA1|refs/heads/master|*\nSHA2|refs/remotes/origin/main| ');
    
    const branches = await electron.getBranches('/path');
    
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('git:branches', '/path');
    expect(branches).toHaveLength(2);
    expect(branches[0]).toEqual({ name: 'master', commitId: 'SHA1', isCurrentRepositoryHead: true, isRemote: false });
    expect(branches[1]).toEqual({ name: 'origin/main', commitId: 'SHA2', isCurrentRepositoryHead: false, isRemote: true });
  });
});
