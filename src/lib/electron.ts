// src/lib/electron.ts
// This file is a bridge to Electron's ipcRenderer for main process communications.

/**
 * Robustly get the ipcRenderer from the window object.
 * We use dynamic require to avoid issues with bundlers and SSR.
 */
const getIpc = () => {
    if (typeof window !== 'undefined') {
        // 1. Try window.electron (Preload pattern - most reliable)
        if ((window as any).electron && (window as any).electron.ipcRenderer) {
            return (window as any).electron.ipcRenderer;
        }
        // 2. Try window.require (Standard nodeIntegration: true)
        if ((window as any).require) {
            try {
                return (window as any).require('electron').ipcRenderer;
            } catch (e) {}
        }
    }
    return null;
};

// Snapshot and History interfaces for type safety
interface Snapshot {
    id: string;
    timestamp: number;
    filePath: string;
    eventType: 'save' | 'rename' | 'delete' | 'label' | 'manual' | 'selection';
    storagePath?: string;
    label?: string;
    description?: string;
    relevantRange?: { start: number; end: number };
    linesAdded?: number;
    linesDeleted?: number;
    pinned?: boolean;
}

interface HistoryIndex {
    snapshots: Snapshot[];
}

// Helper for invoking IPC with error handling
async function safeInvoke(channel: string, ...args: any[]) {
    const ipc = getIpc();
    if (!ipc) {
        console.warn(`ipcRenderer not available for channel: ${channel}`);
        // Return a default value or throw depending on the use case
        if (channel.startsWith('dialog:')) return { canceled: true, filePaths: [] };
        if (channel === 'fs:readChronosHistoryIndex') return { snapshots: [] };
        return null;
    }
    try {
        return await ipc.invoke(channel, ...args);
    } catch (e) {
        console.error(`Error invoking IPC channel ${channel}:`, e);
        throw e;
    }
}

// File System IPC handlers
export async function readDirectory(directoryPath: string) {
    return safeInvoke('fs:readDirectory', directoryPath);
}

export async function readAllFiles(directoryPath: string) {
    return safeInvoke('fs:readAllFiles', directoryPath);
}

export async function readChronosHistoryIndex(repoPath: string): Promise<HistoryIndex> {
    return safeInvoke('fs:readChronosHistoryIndex', repoPath);
}

export async function readChronosSnapshotContent(repoPath: string, storagePath: string): Promise<string> {
    const result = await safeInvoke('fs:readChronosSnapshotContent', { repoPath, storagePath });
    return result || '';
}

export async function appendFile(filePath: string, content: string): Promise<void> {
    return safeInvoke('fs:appendFile', { path: filePath, content });
}

export async function writeFile(filePath: string, content: string): Promise<void> {
    return safeInvoke('fs:writeFile', { path: filePath, content });
}

export async function saveFile(defaultPath: string, filters: any[]) {
    return safeInvoke('dialog:saveFile', { defaultPath, filters });
}

// Git-related IPC handlers
export async function showBinary(repoPath: string, ref: string, filePath: string): Promise<string | null> {
    return safeInvoke('git:showBinary', { repoPath, ref, filePath });
}

export async function getDiffDetails(repoPath: string, filePath: string, staged: boolean) {
    const result = await safeInvoke('git:diffDetails', { repoPath, filePath, staged });
    return result || { patch: '', original: '', modified: '' };
}

export async function compareFiles(repoPath: string, pathA: string, refA: string | null, pathB: string, refB: string | null) {
    const result = await safeInvoke('git:compareFiles', { repoPath, pathA, refA, pathB, refB });
    return result || { patch: '', original: '', modified: '' };
}

export async function cloneRepo(url: string, destination: string): Promise<void> {
    return safeInvoke('git:clone', { url, destination });
}

export async function getFileHistory(repoPath: string, filePath: string): Promise<string> {
    return safeInvoke('git:fileHistory', { repoPath, filePath });
}

export async function getLog(repoPath: string, count = 50, filePath?: string): Promise<any[]> {
    const output = await safeInvoke('git:log', { repoPath, count, filePath });
    if (!output) return [];
    return output.split('\n')
        .filter((l: string) => l.includes('|'))
        .map((line: string) => {
            const [id, author, timestamp, message] = line.split('|');
            return { id, author, timestamp, message };
        });
}

export async function getRepoStatus(repoPath: string): Promise<any> {
    const output = await safeInvoke('git:status', repoPath);
    if (!output) return { files: [] };
    const files = output.split('\n').filter((l: string) => l).map((line: string) => {
        const status = line.substring(0, 2);
        const path = line.substring(3);
        let readableStatus = 'Untracked';
        if (status === 'M ') readableStatus = 'Staged';
        if (status === ' M') readableStatus = 'Unstaged';
        if (status === 'A ') readableStatus = 'Added';
        return { path, status: readableStatus };
    });
    return { files };
}

export async function getBranches(repoPath: string, filePath?: string): Promise<any[]> {
    const output = await safeInvoke('git:branches', { repoPath, filePath });
    if (!output) return [];
    return output.split('\n').filter((l: string) => l).map((line: string) => {
        const [commitId, refName, head] = line.split('|');
        const name = refName.replace('refs/heads/', '').replace('refs/remotes/', '');
        return { 
            name, 
            commitId, 
            isCurrentRepositoryHead: head === '*',
            isRemote: refName.startsWith('refs/remotes/')
        };
    });
}

export async function gitShow(repoPath: string, ref: string, filePath: string): Promise<string> {
    return safeInvoke('git:show', { repoPath, ref, filePath });
}

export async function getConfig(repoPath: string): Promise<string> {
    return safeInvoke('git:config', repoPath);
}

export async function setConfig(repoPath: string, key: string, value: string): Promise<void> {
    return safeInvoke('git:setConfig', { repoPath, key, value });
}

export async function lsFiles(repoPath: string): Promise<string> {
    return safeInvoke('git:lsFiles', repoPath);
}

export async function getCommitsForDate(repoPath: string, since: string, until: string): Promise<any[]> {
    return safeInvoke('git:commitsForDate', { repoPath, since, until });
}

export async function generateDailyBrief(commits: any[], apiKey: string, endpoint: string, model: string, language: string): Promise<string> {
    return safeInvoke('git:dailyBrief', { commits, apiKey, model, language });
}

export async function getSelectionHistory(repoPath: string, filePath: string, startLine: number, endLine: number): Promise<string> {
    return safeInvoke('git:selectionHistory', { repoPath, filePath, startLine, endLine });
}

export async function getSearchHistory(repoPath: string, filePath: string, searchText: string): Promise<string> {
    return safeInvoke('git:searchHistory', { repoPath, filePath, searchText });
}

export async function grepHistory(repoPath: string, pattern: string): Promise<string> {
    return safeInvoke('git:grepHistory', { repoPath, pattern });
}

// Dialog for opening a directory
export async function openDirectoryDialog(): Promise<{ canceled: boolean; filePaths: string[] }> {
    return safeInvoke('dialog:openDirectory');
}

// Event Listeners
export function onMenuOpenFolder(callback: (path: string) => void) {
    const ipc = getIpc();
    if (ipc) {
        const handler = (_: any, path: string) => callback(path);
        ipc.on('menu:open-folder', handler);
        return () => ipc.removeListener('menu:open-folder', handler);
    }
    return () => {};
}

/**
 * @deprecated Use the returned cleanup function from onMenuOpenFolder instead
 */
export function removeMenuOpenFolderListener() {
    const ipc = getIpc();
    if (ipc) {
        ipc.removeAllListeners('menu:open-folder');
    }
}
