'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Moon, Sun, FolderOpen, FileText, Search, RefreshCw, GitBranch, ArrowLeft, X, Maximize2, Minimize2, ExternalLink, Save, Settings as SettingsIcon, Pin, PinOff, ArrowRightLeft, Sparkles } from 'lucide-react';
import { 
  openDirectoryDialog, 
  readAllFiles, 
  onMenuOpenFolder, 
  removeMenuOpenFolderListener,
  readChronosHistoryIndex,
  compareFiles,
  writeFile,
  getFileHistory,
  getSelectionHistory,
  getSearchHistory,
} from '@/lib/electron';
import { getLanguageFromPath } from '@/lib/utils';
import ExplorerTree, { FileEntry } from '@/components/ExplorerTree';
import ChronosHistoryList from '@/components/ChronosHistoryList';
import DiffView from '@/components/DiffView'; 
import SettingsDialog from '@/components/SettingsDialog';
import CompareFilesDialog from '@/components/CompareFilesDialog';
import DailyBriefDialog from '@/components/DailyBriefDialog';
import HelpDialog from '@/components/HelpDialog';
import GrepSearchDialog from '@/components/GrepSearchDialog';
import ChronosLogo from '@/components/ChronosLogo';
import AboutDialog from '@/components/AboutDialog';

const BlackHoleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className={className}>
    <circle cx="8" cy="8" r="3" fill="currentColor"/>
    <path fill="currentColor" d="M8 1C4.134 1 1 4.134 1 8c0 1.25.33 2.42.9 3.44l1.35-.78A5.5 5.5 0 0 1 2.5 8c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5-2.462 5.5-5.5 5.5a5.48 5.48 0 0 1-2.43-.57l-1.35.78A6.97 6.97 0 0 0 8 15c3.866 0 7-3.134 7-7s-3.134-7-7-7z"/>
    <path fill="currentColor" d="M11.5 8a3.5 3.5 0 0 1-3.5 3.5 3.48 3.48 0 0 1-1.55-.36l-.87.5a4.5 4.5 0 0 0 5.92-5.92l-.87.5c.23.4.37.87.37 1.28z"/>
  </svg>
);

interface Snapshot {
    id: string;
    timestamp: number;
    filePath: string; 
    eventType: 'save' | 'rename' | 'delete' | 'label' | 'manual' | 'selection';
    storagePath?: string; 
    label?: string;
    description?: string;
    linesAdded?: number;
    linesDeleted?: number;
    pinned?: boolean;
    relevantRange?: { start: number; end: number; };
}

interface HistoryIndex {
    snapshots: Snapshot[];
}

interface DiffData {
  patch: string;
  original: string;
  modified: string;
  isImage?: boolean;
}

export default function Home() {
  const [repoPath, setRepoPath] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Data
  const [allFiles, setAllFiles] = useState<FileEntry[]>([]);
  const [chronosHistory, setChronosHistory] = useState<Snapshot[]>([]);
  const [gitHistory, setGitHistory] = useState<any[]>([]);
  
  // Selection
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<any | null>(null);
  
  // View State
  const [diffData, setDiffData] = useState<DiffData | null>(null);
  const [modifiedContent, setModifiedContent] = useState<string | null>(null);
  const [fileSearch, setFileSearch] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [grepOpen, setGrepOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareSelectionOpen, setCompareSelectionOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [appVersion, setAppVersion] = useState('N/A');
  const [historyMode, setHistoryMode] = useState<'local' | 'git'>('local');
  const [pinnedVersion, setPinnedVersion] = useState<{ type: 'local' | 'git', id: string, label: string, ref: string } | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ startLine: number, endLine: number, searchText?: string } | null>(null);
  const [isFilteringBySelection, setIsFilteringBySelection] = useState(false);
  const [selectionGitHistory, setSelectionGitHistory] = useState<any[]>([]);
  const [selectionLocalHistory, setSelectionLocalHistory] = useState<Snapshot[]>([]);

  // Initial Load & Listeners
  useEffect(() => {
    const cleanup = onMenuOpenFolder((path: string) => {
      console.log("Menu open folder event received:", path);
      handleOpenFolder(path);
    });

    const ipc = (window as any).electron?.ipcRenderer;
    if (ipc) {
      ipc.on('menu:open-settings', () => setSettingsOpen(true));
      ipc.on('menu:open-help', () => setHelpOpen(true));
      ipc.on('menu:open-about', () => setAboutOpen(true)); // New listener

      // Fetch app version
      ipc.invoke('app:getVersion').then((version: string) => {
        setAppVersion(version);
      }).catch(console.error);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            setGrepOpen(true);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    // Load theme preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) setTheme(savedTheme);

    return () => {
      cleanup();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.body.className = theme;
  }, [theme]);

  // Load Folder Logic
  const handleOpenFolder = async (path: string) => {
    console.log("Opening folder:", path);
    setLoading(true);
    setRepoPath(path);
    setError('');
    setAllFiles([]);
    setChronosHistory([]);
    setSelectedFile(null);
    setSelectedSnapshot(null);
    setDiffData(null);

    try {
      // Parallel fetch
      const [files, historyIndex] = await Promise.all([
        readAllFiles(path),
        readChronosHistoryIndex(path).catch((e) => {
            console.warn("History index not found or error:", e);
            return { snapshots: [] };
        })
      ]);

      console.log(`Found ${files.length} files and ${historyIndex.snapshots.length} history snapshots`);
      setAllFiles(files.sort((a: FileEntry, b: FileEntry) => a.path.localeCompare(b.path)));
      setChronosHistory(historyIndex.snapshots.sort((a: Snapshot, b: Snapshot) => b.timestamp - a.timestamp));
      
    } catch (err: any) {
      console.error("Error in handleOpenFolder:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBrowse = async () => {
    console.log("Browsing for folder...");
    const ipc = (window as any).electron?.ipcRenderer || (window as any).require?.('electron')?.ipcRenderer;
    if (!ipc) {
        alert("IPC not found. Please ensure you are running the application via Electron, not a standard browser.");
        return;
    }
    setLoading(true);
    try {
      const result = await openDirectoryDialog();
      console.log("Browse result:", result);
      if (!result.canceled && result.filePaths.length > 0) {
        await handleOpenFolder(result.filePaths[0]);
      }
    } catch (err: any) {
      console.error("Error in handleBrowse:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtered Files for Search
  const filteredFiles = useMemo(() => {
    if (!fileSearch) return allFiles;
    return allFiles.filter(f => f.path.toLowerCase().includes(fileSearch.toLowerCase()));
  }, [allFiles, fileSearch]);

  // Filtered History for Selected File
  const fileHistory = useMemo(() => {
    if (!selectedFile || !repoPath) return [];
    
    // Calculate relative path for matching
    let relativePath = selectedFile;
    if (selectedFile.startsWith(repoPath)) {
        relativePath = selectedFile.substring(repoPath.length);
        if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
            relativePath = relativePath.substring(1);
        }
    }
    // Normalize slashes and case
    const normalizedSelected = selectedFile.replace(/\\/g, '/').toLowerCase();
    relativePath = relativePath.replace(/\\/g, '/').toLowerCase();

    return chronosHistory.filter(s => {
        const sPath = s.filePath.replace(/\\/g, '/').toLowerCase();
        // Match if it's the exact relative path OR the exact absolute path
        return sPath === relativePath || sPath === normalizedSelected;
    });
  }, [chronosHistory, selectedFile, repoPath]);

  // Handle File Click
  const onFileClick = async (path: string) => {
    setSelectedFile(path);
    setSelectedSnapshot(null);
    setSelectedCommit(null);
    setDiffData(null);
    setModifiedContent(null);
    setGitHistory([]);
    setSelectionGitHistory([]);
    setSelectionLocalHistory([]);
    setIsFilteringBySelection(false);
    setSelectedRange(null);
    setIsMaximized(true); // Auto-focus on selection

    if (repoPath) {
        try {
            // Resolve relative path for git
            let relativePath = path;
            if (path.startsWith(repoPath)) {
                relativePath = path.substring(repoPath.length);
                if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
                    relativePath = relativePath.substring(1);
                }
            }
            const output = await getFileHistory(repoPath, relativePath);
            const parsed = output.split('\n')
                .filter((l: string) => l.includes('|'))
                .map((line: string) => {
                    const [id, author, date, message] = line.split('|');
                    return { id, author, date, message };
                });
            setGitHistory(parsed);
        } catch (e) {
            console.error("Failed to load git history:", e);
        }
    }
  };

  const onSnapshotClick = async (snapshot: Snapshot) => {
    setSelectedSnapshot(snapshot);
    setSelectedCommit(null);
    if (!repoPath || !selectedFile) return;

    setLoading(true);
    setModifiedContent(null);
    try {
       let relativePath = selectedFile;
       if (selectedFile.startsWith(repoPath)) {
           relativePath = selectedFile.substring(repoPath.length);
           if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
               relativePath = relativePath.substring(1);
           }
       }

       let storageRef = snapshot.storagePath || snapshot.id;
       let snapshotRef = storageRef;
       const isAbsolute = storageRef.startsWith('/') || storageRef.includes(':');
       if (!isAbsolute) {
           snapshotRef = `.history/${storageRef}`;
       }
       
       if (pinnedVersion) {
           console.log(`Comparing Pin: ${pinnedVersion.ref} VS Snapshot: ${snapshotRef}`);
           const result = await compareFiles(
               repoPath,
               pinnedVersion.type === 'git' ? relativePath : pinnedVersion.ref, 
               pinnedVersion.type === 'git' ? pinnedVersion.ref : null,
               snapshotRef, null
           );
           setDiffData(result);
       } else {
           console.log(`Comparing Snapshot: ${snapshotRef} VS Working: ${relativePath}`);
           const result = await compareFiles(
               repoPath,
               snapshotRef, null,
               relativePath, null
           );
           setDiffData(result);
           setModifiedContent(result.modified);
       }
    } catch (e: any) {
        console.error("Diff Error:", e);
        setError("Failed to load diff: " + e.message);
    } finally {
        setLoading(false);
    }
  };

  const onCommitClick = async (commit: any) => {
    setSelectedCommit(commit);
    setSelectedSnapshot(null);
    if (!repoPath || !selectedFile) return;

    setLoading(true);
    setModifiedContent(null);
    try {
       let relativePath = selectedFile;
       if (selectedFile.startsWith(repoPath)) {
           relativePath = selectedFile.substring(repoPath.length);
           if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
               relativePath = relativePath.substring(1);
           }
       }

       if (pinnedVersion) {
           console.log(`Comparing Pin: ${pinnedVersion.ref} VS Git Commit: ${commit.id}`);
           const result = await compareFiles(
               repoPath,
               pinnedVersion.type === 'git' ? relativePath : pinnedVersion.ref, 
               pinnedVersion.type === 'git' ? pinnedVersion.ref : null,
               relativePath, commit.id
           );
           setDiffData(result);
       } else {
           console.log(`Comparing Git Commit: ${commit.id} VS Working: ${relativePath}`);
           const result = await compareFiles(
               repoPath,
               relativePath, commit.id,
               relativePath, null
           );
           setDiffData(result);
           setModifiedContent(result.modified);
       }
    } catch (e: any) {
        console.error("Git Diff Error:", e);
        setError("Failed to load git diff: " + e.message);
    } finally {
        setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedFile || modifiedContent === null) return;
    
    setIsSaving(true);
    try {
        await writeFile(selectedFile, modifiedContent);
        // Refresh diff data to confirm save
        if (selectedSnapshot) {
            await onSnapshotClick(selectedSnapshot);
        } else if (selectedCommit) {
            await onCommitClick(selectedCommit);
        }
    } catch (e: any) {
        console.error("Save Error:", e);
        setError("Failed to save file: " + e.message);
    } finally {
        setIsSaving(false);
    }
  };

  const handlePinSnapshot = (snapshot: Snapshot) => {
    if (pinnedVersion?.id === snapshot.id) {
        setPinnedVersion(null);
    } else {
        let storageRef = snapshot.storagePath || snapshot.id;
        if (!storageRef.startsWith('/') && !storageRef.includes(':')) {
            storageRef = `.history/${storageRef}`;
        }
        setPinnedVersion({
            type: 'local',
            id: snapshot.id,
            label: snapshot.label || 'Snapshot',
            ref: storageRef
        });
    }
  };

  const handlePinCommit = (commit: any) => {
    if (pinnedVersion?.id === commit.id) {
        setPinnedVersion(null);
    } else {
        setPinnedVersion({
            type: 'git',
            id: commit.id,
            label: commit.id.substring(0, 7),
            ref: commit.id
        });
    }
  };

  const handleSelectionHistory = async (rangeOverride?: any) => {
    const targetRange = rangeOverride || selectedRange;
    if (!targetRange || !selectedFile || !repoPath) return;
    
    setLoading(true);
    setIsFilteringBySelection(true);
    try {
        let relativePath = selectedFile;
        if (selectedFile.startsWith(repoPath)) {
            relativePath = selectedFile.substring(repoPath.length);
            if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
                relativePath = relativePath.substring(1);
            }
        }

        // 1. Fetch Git Selection History (Line range OR Text search)
        let gitOutput = "";
        if (targetRange.searchText) {
            console.log(`Searching Git History for text: "${targetRange.searchText}"`);
            gitOutput = await getSearchHistory(repoPath, relativePath, targetRange.searchText);
        } else {
            console.log(`Searching Git History for lines: ${targetRange.startLine}-${targetRange.endLine}`);
            gitOutput = await getSelectionHistory(repoPath, relativePath, targetRange.startLine, targetRange.endLine);
        }

        const parsedGit = gitOutput.split('\n')
            .filter((l: string) => l.includes('|'))
            .map((line: string) => {
                const [id, author, date, message] = line.split('|');
                return { id, author, date, message };
            });
        setSelectionGitHistory(parsedGit);

        // 2. Filter Local History
        if (targetRange.searchText) {
            // For text search in local, we'd ideally read all files and check content.
            // For now, let's just use the current file history snapshots as a base.
            setSelectionLocalHistory(fileHistory); 
        } else {
            const filteredLocal = fileHistory.filter(s => {
                if (!s.relevantRange) return true;
                return (s.relevantRange.start <= targetRange.endLine && s.relevantRange.end >= targetRange.startLine);
            });
            setSelectionLocalHistory(filteredLocal);
        }

    } catch (e: any) {
        console.error("Selection History Error:", e);
        setError("Failed to load history for selection: " + e.message);
    } finally {
        setLoading(false);
    }
  };

  const clearSelectionFilter = () => {
    setIsFilteringBySelection(false);
    setSelectionGitHistory([]);
    setSelectionLocalHistory([]);
  };

  return (
    <main className={`flex h-screen overflow-hidden bg-background ${theme === 'dark' ? 'dark text-foreground' : ''}`}>
      
      {/* Sidebar: File Explorer */}
      <div className="w-72 border-r flex flex-col h-full bg-muted/5 flex-shrink-0">
        <div className="h-14 border-b flex items-center justify-between px-4 flex-shrink-0">
            <div className="flex items-center gap-2 font-bold tracking-tight">
                <div className="p-1 bg-primary/10 rounded text-primary">
                    <ChronosLogo width={20} height={20} className="h-5 w-5" />
                </div>
                <span>Chronos</span>
            </div>
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setGrepOpen(true)} title="Deep History Search (Grep)">
                    <BlackHoleIcon className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setBriefOpen(true)} title="Daily Progress Briefing">
                    <Sparkles className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setCompareOpen(true)} title="Compare Files">
                    <ArrowRightLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setSettingsOpen(true)}>
                    <SettingsIcon className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                    {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </Button>
            </div>
        </div>

        <div className="p-3 border-b space-y-2">
            {!repoPath ? (
                <Button className="w-full" onClick={handleBrowse}>
                    <FolderOpen className="h-4 w-4 mr-2" /> Open Project
                </Button>
            ) : (
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="flex-1 justify-start truncate" onClick={handleBrowse} title={repoPath}>
                        <FolderOpen className="h-3 w-3 mr-2" />
                        <span className="truncate">{repoPath.split('/').pop()}</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenFolder(repoPath)} title="Refresh">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>

        <div className="p-2 border-b bg-muted/10">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                    placeholder="Search files..." 
                    className="pl-8 h-9 text-xs"
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                />
            </div>
        </div>

        <ScrollArea className="flex-1 h-full min-h-0 overflow-hidden">
            <div className="p-2">
                <ExplorerTree
                    files={filteredFiles}
                    selectedFile={selectedFile}
                    onFileClick={onFileClick}
                    rootPath={repoPath}
                />
            </div>
        </ScrollArea>
      </div>

      {/* Main Empty State */}
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
          {!repoPath ? (
              <div className="flex flex-col items-center gap-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-2 shadow-xl shadow-primary/5">
                      <FolderOpen className="h-10 w-10 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Ready to explore?</h2>
                  <p className="max-w-xs text-sm opacity-70">
                      Open a project folder to start tracking and comparing local history snapshots.
                  </p>
                  <Button size="lg" className="mt-2 rounded-full px-8 shadow-lg shadow-primary/20" onClick={handleBrowse}>
                      Select Folder
                  </Button>
              </div>
          ) : !selectedFile ? (
              <div className="flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mb-2">
                      <FileText className="h-8 w-8 text-primary opacity-40" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground/80">Select a file</h2>
                  <p className="max-w-xs text-xs opacity-60">
                      Choose any file from the explorer to see its local history timeline.
                  </p>
              </div>
          ) : (
              <div className="flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in-95 duration-300">
                  <div className="relative">
                      <div className="absolute -inset-4 bg-primary/10 rounded-full blur-xl animate-pulse"></div>
                      <div className="relative w-24 h-24 bg-background border-2 border-primary/20 rounded-3xl flex items-center justify-center shadow-2xl">
                          <ChronosLogo width={48} height={48} className="h-12 w-12 text-primary" />
                      </div>
                  </div>
                  <div className="space-y-2">
                      <h2 className="text-2xl font-bold tracking-tight">{selectedFile.split('/').pop()}</h2>
                      <div className="flex flex-col gap-1 items-center">
                          <p className="text-muted-foreground text-xs opacity-80">
                              <strong>{fileHistory.length}</strong> Chronos Snapshots available.
                          </p>
                          <p className="text-muted-foreground text-xs opacity-80">
                              <strong>{gitHistory.length}</strong> Git Commits found.
                          </p>
                      </div>
                  </div>
                  <Button size="lg" className="rounded-full px-10 gap-2 shadow-xl shadow-primary/20" onClick={() => setIsMaximized(true)}>
                      <ExternalLink className="h-4 w-4" /> Open History Browser
                  </Button>
              </div>
          )}
      </div>

      {/* Full-Screen History Overlay (The "VS Code" experience) */}
      {selectedFile && (
          <div className={`fixed inset-0 z-40 flex flex-col bg-background animate-in fade-in zoom-in-95 duration-200 ${isMaximized ? '' : 'hidden'}`}>
              {/* Overlay Header */}
              <div className="h-14 border-b flex items-center px-4 justify-between bg-muted/20 backdrop-blur-md">
                  <div className="flex items-center gap-4 min-w-0">
                      <div className="flex items-center gap-2 text-primary font-bold">
                          <ChronosLogo width={20} height={20} className="h-5 w-5" />
                          <span className="hidden sm:inline">File History</span>
                      </div>
                      <div className="h-4 w-px bg-border hidden sm:block"></div>
                      <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <h1 className="text-sm font-medium truncate">{selectedFile}</h1>
                      </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                      {selectedSnapshot && (
                          <div className="mr-2 px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase rounded-full border border-primary/20 animate-in slide-in-from-right-2">
                              Viewing: {selectedSnapshot.label || "Snapshot"}
                          </div>
                      )}

                      {selectedCommit && (
                          <div className="mr-2 px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase rounded-full border border-primary/20 animate-in slide-in-from-right-2">
                              Viewing: {selectedCommit.id.substring(0, 7)}
                          </div>
                      )}
                      
                      {modifiedContent !== null && diffData && modifiedContent !== diffData.modified && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="h-8 gap-2 bg-green-600 hover:bg-green-700 text-white"
                            onClick={handleSave}
                            disabled={isSaving}
                          >
                            <Save className={`h-4 w-4 ${isSaving ? 'animate-pulse' : ''}`} />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                          </Button>
                      )}

                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMaximized(false)}>
                          <X className="h-5 w-5" />
                      </Button>
                  </div>
              </div>

              {/* Overlay Body (Side by Side) */}
              <div className="flex-1 flex overflow-hidden">
                  {/* Left: History Timeline */}
                  <div className="w-80 border-r flex flex-col bg-muted/5 flex-shrink-0 h-full min-h-0">
                      <div className="p-3 border-b bg-background/50 flex flex-col gap-3 flex-shrink-0">
                          <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                      {isFilteringBySelection ? 'Filtered Results' : (historyMode === 'local' ? 'Chronos Snapshots' : 'Git Commits')}
                                  </span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${isFilteringBySelection ? 'bg-primary/20 text-primary' : 'bg-muted'}`}>
                                      {historyMode === 'local' 
                                        ? (isFilteringBySelection ? selectionLocalHistory.length : fileHistory.length) 
                                        : (isFilteringBySelection ? selectionGitHistory.length : gitHistory.length)}
                                  </span>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full h-8 text-[10px] font-bold uppercase border-primary/20 text-primary hover:bg-primary/5 gap-2"
                                onClick={() => setCompareOpen(true)}
                              >
                                <ArrowRightLeft className="h-3 w-3" />
                                Multi-Source Comparison
                              </Button>
                          </div>
                          
                          <div className="flex bg-muted/50 p-1 rounded-lg">
                              <Button 
                                variant={historyMode === 'local' ? 'secondary' : 'ghost'} 
                                size="sm" 
                                className="flex-1 h-7 text-[10px] uppercase font-bold"
                                onClick={() => setHistoryMode('local')}
                              >
                                Local
                              </Button>
                              <Button 
                                variant={historyMode === 'git' ? 'secondary' : 'ghost'} 
                                size="sm" 
                                className="flex-1 h-7 text-[10px] uppercase font-bold"
                                onClick={() => setHistoryMode('git')}
                              >
                                Git
                              </Button>
                          </div>

                          {(selectedRange || isFilteringBySelection) && (
                              <div className="flex flex-col gap-2 pt-1 animate-in fade-in slide-in-from-top-2">
                                  {!isFilteringBySelection ? (
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 text-[10px] uppercase font-bold border-primary/30 text-primary hover:bg-primary/5 px-2"
                                        onClick={() => handleSelectionHistory()}
                                      >
                                          <Sparkles className="h-3 w-3 mr-2" />
                                          {selectedRange?.searchText 
                                            ? `Search "${selectedRange.searchText.substring(0, 15)}${selectedRange.searchText.length > 15 ? '...' : ''}"`
                                            : `History for lines ${selectedRange?.startLine}-${selectedRange?.endLine}`
                                          }
                                      </Button>
                                  ) : (
                                      <Button 
                                        variant="secondary" 
                                        size="sm" 
                                        className="h-8 text-[10px] uppercase font-bold"
                                        onClick={clearSelectionFilter}
                                      >
                                          <X className="h-3 w-3 mr-2" />
                                          Clear Selection Filter
                                      </Button>
                                  )}
                              </div>
                          )}
                      </div>
                      
                      <ScrollArea className="flex-1 h-full min-h-0">
                          {historyMode === 'local' ? (
                              <ChronosHistoryList 
                                  snapshots={isFilteringBySelection ? selectionLocalHistory : fileHistory}
                                  selectedSnapshotId={selectedSnapshot?.id || null}
                                  pinnedId={pinnedVersion?.id || null}
                                  onSnapshotClick={onSnapshotClick}
                                  onPinClick={handlePinSnapshot}
                              />
                          ) : (
                              <div className="space-y-1 p-2">
                                  {(isFilteringBySelection ? selectionGitHistory : gitHistory).map((commit, idx) => (
                                          <div
                                              key={`${commit.id}-${idx}`}
                                              className={`flex flex-col p-2 rounded cursor-pointer text-sm border transition-colors group relative ${
                                                  selectedCommit?.id === commit.id 
                                                      ? 'bg-primary/10 border-primary/20' 
                                                      : pinnedVersion?.id === commit.id
                                                      ? 'bg-orange-500/10 border-orange-500/20'
                                                      : 'hover:bg-muted border-transparent hover:border-border'
                                              }`}
                                              onClick={() => onCommitClick(commit)}
                                          >
                                              <div className="flex items-center justify-between mb-1">
                                                  <div className="flex items-center gap-2 font-medium truncate pr-6">
                                                      <span className={`p-1 rounded-full ${pinnedVersion?.id === commit.id ? 'bg-orange-500/20 text-orange-500' : 'bg-muted/50 text-muted-foreground'}`}>
                                                          <GitBranch className="h-3 w-3" />
                                                      </span>
                                                      <span className="truncate font-mono text-[11px]" title={commit.id}>
                                                          {commit.id.substring(0, 7)}
                                                      </span>
                                                  </div>
                                                  <span className="text-[10px] text-muted-foreground flex-shrink-0 whitespace-nowrap ml-2 group-hover:hidden">
                                                      {new Date(commit.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                  </span>
                                                  
                                                  <button 
                                                      className={`absolute right-2 top-2 p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity ${pinnedVersion?.id === commit.id ? 'text-orange-500 opacity-100' : 'text-muted-foreground'}`}
                                                      onClick={(e) => {
                                                          e.stopPropagation();
                                                          handlePinCommit(commit);
                                                      }}
                                                      title={pinnedVersion?.id === commit.id ? "Unpin Base Version" : "Pin as Base Version for Comparison"}
                                                  >
                                                      {pinnedVersion?.id === commit.id ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                                                  </button>
                                              </div>
                                              <div className="text-xs text-foreground/80 line-clamp-2 pl-7" title={commit.message}>
                                                  {commit.message}
                                              </div>
                                              <div className="text-[10px] text-muted-foreground pl-7 mt-1 italic">
                                                  by {commit.author}
                                              </div>
                                          </div>
                                      ))}
                                      {gitHistory.length === 0 && (
                                          <div className="p-8 text-center text-muted-foreground text-xs italic">
                                              No git history found for this file.
                                          </div>
                                      )}
                                  </div>
                              )}
                      </ScrollArea>
                  </div>

                  {/* Right: The Diff View */}
                  <div className="flex-1 bg-muted/10 relative flex flex-col">
                      {pinnedVersion && (
                          <div className="bg-orange-500/10 border-b border-orange-500/20 px-4 py-2 flex items-center justify-between animate-in slide-in-from-top duration-300">
                              <div className="flex items-center gap-2 text-xs font-medium text-orange-600 dark:text-orange-400">
                                  <Pin className="h-3 w-3 animate-pulse" />
                                  <span>Comparing against base: <strong>{pinnedVersion.label}</strong> ({pinnedVersion.type === 'local' ? 'Local' : 'Git'})</span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 text-[10px] uppercase font-bold hover:bg-orange-500/20 text-orange-600 dark:text-orange-400"
                                onClick={() => setPinnedVersion(null)}
                              >
                                  <PinOff className="h-3 w-3 mr-1" /> Stop Comparing
                              </Button>
                          </div>
                      )}

                      {error && (
                          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-lg">
                              <div className="bg-destructive text-destructive-foreground p-3 rounded-lg shadow-2xl flex justify-between items-center text-sm">
                                                                                                                            <div className="flex items-center gap-2">
                                                                                                                                <ChronosLogo width={16} height={16} className="h-4 w-4" />
                                                                                                                                <span>{error}</span>
                                                                                                                            </div>                                  <Button variant="ghost" size="sm" className="h-6 text-white hover:bg-white/20" onClick={() => setError('')}>Dismiss</Button>
                              </div>
                          </div>
                      )}

                      {!diffData ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                              {loading ? (
                                  <div className="flex flex-col items-center gap-4">
                                      <RefreshCw className="h-10 w-10 animate-spin text-primary opacity-40" />
                                      <p className="text-sm font-medium animate-pulse">Building diff view...</p>
                                  </div>
                              ) : (
                                                                                                                <div className="flex flex-col items-center gap-4 opacity-30">
                                                                                                                    <ChronosLogo width={80} height={80} className="h-20 w-20" />
                                                                                                                    <p className="text-lg font-medium">Select a version to compare</p>
                                                                                                                </div>                              )}
                          </div>
                      ) : (
                          <div className="h-full p-4 flex flex-col">
                              <DiffView 
                                  id={selectedSnapshot?.id || selectedCommit?.id}
                                  original={diffData.original}
                                  modified={diffData.modified}
                                  language={getLanguageFromPath(selectedFile)}
                                  theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                                  onChange={(val) => setModifiedContent(val || '')}
                                  onSelectionChange={(range: any) => {
                                      setSelectedRange(range);
                                      if (range?.triggerSearch) {
                                          handleSelectionHistory(range);
                                      }
                                      if (range?.triggerCompare) {
                                          setCompareSelectionOpen(true);
                                      }
                                  }}
                              />
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      <SettingsDialog 
        open={settingsOpen} 
        onOpenChange={setSettingsOpen} 
        repoPath={repoPath} 
      />

      <CompareFilesDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        repoPath={repoPath}
        initialFileA={selectedFile || undefined}
      />

      <CompareFilesDialog
        open={compareSelectionOpen}
        onOpenChange={setCompareSelectionOpen}
        repoPath={repoPath}
        initialFileA={selectedFile || undefined}
        initialRange={selectedRange}
      />

      <DailyBriefDialog
        open={briefOpen}
        onOpenChange={setBriefOpen}
        repoPath={repoPath}
      />

      <HelpDialog
        open={helpOpen}
        onOpenChange={setHelpOpen}
      />

      <GrepSearchDialog
        open={grepOpen}
        onOpenChange={setGrepOpen}
        repoPath={repoPath}
        onCommitSelect={async (commit) => {
          // When a commit is selected from global search, 
          // we need to show it in the history browser.
          // For simplicity, we keep the current file selected (if any)
          // and switch to git mode to show this commit.
          setHistoryMode('git');
          onCommitClick(commit);
        }}
      />

      <AboutDialog
        open={aboutOpen}
        onOpenChange={setAboutOpen}
        appVersion={appVersion}
      />

    </main>
  );
}
