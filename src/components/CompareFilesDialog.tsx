import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Search, FileText, ArrowRightLeft, Loader2, X, GitBranch, MousePointer2, Sparkles, Save, FileEdit, Maximize2, Minimize2 } from 'lucide-react';
import { compareFiles, lsFiles, getBranches, readChronosHistoryIndex, getFileHistory, getLog, writeFile } from '@/lib/electron';
import DiffView from './DiffView';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'cmdk';
import { getLanguageFromPath, sliceLines } from '@/lib/utils';
import ChronosLogo from './ChronosLogo';

interface CompareFilesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    repoPath: string;
    initialFileA?: string;
    initialRange?: { startLine: number, endLine: number } | null;
}

type CompareMode = 'working' | 'git' | 'history';

export default function CompareFilesDialog({ open, onOpenChange, repoPath, initialFileA, initialRange }: CompareFilesDialogProps) {
    const [pathA, setPathA] = useState(initialFileA || '');
    const [refA, setRefA] = useState('');
    const [modeA, setModeA] = useState<CompareMode>('working');
    
    const [pathB, setPathB] = useState('');
    const [refB, setRefB] = useState('');
    const [modeB, setModeB] = useState<CompareMode>('working');

    const [loading, setLoading] = useState(false);
    const [diffData, setDiffData] = useState<any>(null);
    const [fullContentB, setFullContentB] = useState<string | null>(null);
    const [editableContent, setEditableContent] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [files, setFiles] = useState<string[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [gitHistory, setGitHistory] = useState<any[]>([]);
    const [repoHistory, setRepoHistory] = useState<any[]>([]);
    const [historySnapshots, setHistorySnapshots] = useState<any[]>([]);
    const [gitTab, setGitTab] = useState<'branches' | 'file' | 'repo'>('branches');
    
    const [limitToSelection, setLimitToSelection] = useState(false);
    const [selectionRange, setSelectionRange] = useState<{ startLine: number, endLine: number } | null>(null);
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);

    const [pickingType, setPickingType] = useState<'fileA' | 'fileB' | 'refA' | 'refB' | 'histA' | 'histB' | null>(null);

    useEffect(() => {
        if (open) {
            if (initialFileA) {
                setPathA(initialFileA);
                if (!pathB) setPathB(initialFileA); 
                if (modeA === 'history') loadHistory(initialFileA);
                if (modeA === 'git') loadGitHistory(initialFileA);
                if (modeB === 'history') loadHistory(initialFileA);
                if (modeB === 'git') loadGitHistory(initialFileA);
            }
            if (initialRange) {
                setSelectionRange(initialRange);
                setLimitToSelection(true);
            } else {
                setSelectionRange(null);
                setLimitToSelection(false);
            }
            loadFiles();
            loadBranches();
            loadRepoHistory();
        } else {
            setDiffData(null);
            setEditableContent(null);
            setIsHeaderVisible(true);
        }
    }, [open, initialFileA, initialRange, repoPath]);

    const loadFiles = async () => {
        try {
            const output = await lsFiles(repoPath);
            setFiles(output.split('\n').filter(Boolean));
        } catch (e) { console.error(e); }
    };

    const loadBranches = async () => {
        try {
            const b = await getBranches(repoPath);
            setBranches(b);
        } catch (e) { console.error(e); }
    };

    const loadHistory = async (filePath: string) => {
        try {
            const index = await readChronosHistoryIndex(repoPath);
            const normalized = filePath.replace(/\\/g, '/').toLowerCase();
            const filtered = index.snapshots.filter((s: any) => {
                const sPath = s.filePath.replace(/\\/g, '/').toLowerCase();
                return sPath === normalized || filePath.endsWith(sPath);
            });
            setHistorySnapshots(filtered.sort((a: any, b: any) => b.timestamp - a.timestamp));
        } catch (e) { console.error(e); }
    };

    const getRelativePath = (absPath: string) => {
        if (!absPath || !repoPath) return absPath;
        if (absPath.startsWith(repoPath)) {
            let rel = absPath.substring(repoPath.length);
            if (rel.startsWith('/') || rel.startsWith('\\')) rel = rel.substring(1);
            return rel;
        }
        return absPath;
    };

    const loadGitHistory = async (filePath: string) => {
        if (!repoPath) return;
        try {
            const relPath = getRelativePath(filePath);
            const output = await getFileHistory(repoPath, relPath);
            const parsed = output.split('\n').filter((l: string) => l.includes('|')).map((line: string) => {
                const [id, author, date, message] = line.split('|');
                return { id, author, date, message };
            });
            setGitHistory(parsed);
        } catch (e) { console.error(e); }
    };

    const loadRepoHistory = async () => {
        try {
            const output = await getLog(repoPath, 50);
            setRepoHistory(output);
        } catch (e) { console.error(e); }
    };

    const handleCompare = async () => {
        if (!pathA || !pathB || !repoPath) {
            window.alert(`Required:\n- Source: ${pathA || 'Missing'}\n- Target: ${pathB || 'Missing'}\n- Project: ${repoPath || 'Missing'}`);
            return;
        }
        setLoading(true);
        setDiffData(null);
        setEditableContent(null);
        try {
            let finalRefA = refA;
            let finalPathA = getRelativePath(pathA);
            if (modeA === 'working') finalRefA = '';
            if (modeA === 'history' && !finalPathA.startsWith('.history/')) finalPathA = `.history/${finalPathA}`;

            let finalRefB = refB;
            let finalPathB = getRelativePath(pathB);
            if (modeB === 'working') finalRefB = '';
            if (modeB === 'history' && !finalPathB.startsWith('.history/')) finalPathB = `.history/${finalPathB}`;

            let data = await compareFiles(repoPath, finalPathA, finalRefA || null, finalPathB, finalRefB || null);
            setFullContentB(data.modified);

            if (data && limitToSelection && selectionRange) {
                data = {
                    ...data,
                    original: sliceLines(data.original, selectionRange.startLine, selectionRange.endLine, 10),
                    modified: sliceLines(data.modified, selectionRange.startLine, selectionRange.endLine, 10)
                };
            }
            setDiffData(data);
            setEditableContent(data?.modified || '');
        } catch (e: any) {
            alert("Comparison Failed: " + e.message);
        } finally { setLoading(false); }
    };

    const handleSave = async () => {
        if (!pathB || editableContent === null || fullContentB === null) return;
        setIsSaving(true);
        try {
            let contentToWrite = editableContent;
            if (limitToSelection && selectionRange) {
                const lines = fullContentB.split('\n');
                const context = 10;
                const startIdx = Math.max(0, selectionRange.startLine - 1 - context);
                const endIdx = Math.min(lines.length, selectionRange.endLine + context);
                const head = lines.slice(0, startIdx).join('\n');
                const tail = lines.slice(endIdx).join('\n');
                contentToWrite = (head ? head + '\n' : '') + editableContent + (tail ? '\n' + tail : '');
            }
            const fullPath = pathB.includes('/') || pathB.includes('\\') ? pathB : `${repoPath}/${pathB}`;
            await writeFile(fullPath, contentToWrite);
            alert("Saved!");
            handleCompare();
        } catch (e: any) { alert("Failed: " + e.message); } finally { setIsSaving(false); }
    };

    const handleSelect = (value: string) => {
        if (pickingType === 'fileA') {
            setPathA(value);
            if (modeA === 'history') loadHistory(value);
            if (modeA === 'git') loadGitHistory(value);
        } else if (pickingType === 'fileB') {
            setPathB(value);
            if (modeB === 'history') loadHistory(value);
            if (modeB === 'git') loadGitHistory(value);
        } else if (pickingType === 'refA') setRefA(value);
        else if (pickingType === 'refB') setRefB(value);
        else if (pickingType === 'histA') setPathA(value);
        else if (pickingType === 'histB') setPathB(value);
        setPickingType(null);
    };

    const renderModeToggle = (side: 'A' | 'B', currentMode: CompareMode, setMode: (m: CompareMode) => void) => (
        <div className="flex bg-muted/50 p-0.5 rounded-md self-start mb-2">
            {(['working', 'git', 'history'] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); const p = side === 'A' ? pathA : pathB; if (m === 'history' && p) loadHistory(p); if (m === 'git' && p) loadGitHistory(p); }}
                    className={`px-2 py-1 text-[10px] uppercase font-bold rounded-sm transition-all ${currentMode === m ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                    {m}
                </button>
            ))}
        </div>
    );

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-background animate-in fade-in duration-200 w-screen h-screen">
            {/* Header section (Collapsible) */}
            {isHeaderVisible ? (
                <div className="flex flex-col flex-shrink-0 animate-in slide-in-from-top duration-300">
                    <div className="px-8 py-4 border-b bg-background flex items-center justify-between shadow-sm">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3 text-xl font-bold uppercase tracking-tight">
                                <div className="p-2 bg-primary/10 rounded-xl"><ArrowRightLeft className="h-6 w-6 text-primary" /></div>
                                Multi-Source Comparison
                            </div>
                            <div className="text-[10px] uppercase tracking-widest font-semibold opacity-40 ml-12">Professional Version Tracking</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="h-10 gap-2 text-xs font-bold uppercase border-primary/20 text-primary hover:bg-primary/5" onClick={() => setIsHeaderVisible(false)}>
                                <Maximize2 className="h-4 w-4" /> Expand Editor
                            </Button>
                            <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => onOpenChange(false)}>
                                <X className="h-6 w-6" />
                            </Button>
                        </div>
                    </div>
                    
                    <div className="px-8 py-3 border-b bg-muted/5 flex-shrink-0 relative">
                        {selectionRange && (
                            <div className="mb-4 flex justify-center">
                                <div className="bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 flex items-center gap-3 shadow-sm">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-wider"><Sparkles className="h-3 w-3" /> Range: L{selectionRange.startLine}-L{selectionRange.endLine}</div>
                                    <div className="h-3 w-px bg-primary/20" />
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input type="checkbox" checked={limitToSelection} onChange={e => setLimitToSelection(e.target.checked)} className="h-3 w-3 accent-primary" />
                                        <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground uppercase">Limit to selection</span>
                                    </label>
                                    <button onClick={() => { setSelectionRange(null); setLimitToSelection(false); }} className="text-[10px] font-bold text-destructive hover:underline ml-2 uppercase">Clear</button>
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between"><Label className="text-xs font-bold uppercase text-muted-foreground">Source A (Original)</Label>{renderModeToggle('A', modeA, setModeA)}</div>
                                <div className="flex gap-2">
                                    <div className="relative flex-grow">
                                        <Input placeholder="Select file..." value={pathA} onChange={e => setPathA(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCompare()} className="pr-8 h-9 text-sm" />
                                        <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-2" onClick={() => setPickingType('fileA')}><Search className="h-4 w-4" /></Button>
                                    </div>
                                    {modeA === 'git' && (
                                        <div className="relative w-40">
                                            <Input placeholder="Ref..." value={refA} onChange={e => setRefA(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCompare()} className="h-9 text-sm pr-8" />
                                            <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-2" onClick={() => { loadBranches(); loadRepoHistory(); if (pathA) loadGitHistory(pathA); setGitTab(pathA ? 'file' : 'branches'); setPickingType('refA'); }}><GitBranch className="h-3 w-3" /></Button>
                                        </div>
                                    )}
                                    {modeA === 'history' && (
                                        <div className="relative w-40">
                                            <Input placeholder="Snapshot..." value={pathA.startsWith('.history/') ? pathA.substring(9) : '...'} readOnly className="h-9 text-sm pr-8" />
                                            <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-2" onClick={() => { if (!pathA) alert("Pick file A first"); else { loadHistory(pathA); setPickingType('histA'); } }}><ChronosLogo width={12} height={12} className="h-3 w-3" /></Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between"><Label className="text-xs font-bold uppercase text-muted-foreground">Source B (Modified)</Label>{renderModeToggle('B', modeB, setModeB)}</div>
                                <div className="flex gap-2">
                                    <div className="relative flex-grow">
                                        <Input placeholder="Select file..." value={pathB} onChange={e => setPathB(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCompare()} className="pr-8 h-9 text-sm" />
                                        <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-2" onClick={() => setPickingType('fileB')}><Search className="h-4 w-4" /></Button>
                                    </div>
                                    {modeB === 'git' && (
                                        <div className="relative w-40">
                                            <Input placeholder="Ref..." value={refB} onChange={e => setRefB(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCompare()} className="h-9 text-sm pr-8" />
                                            <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-2" onClick={() => { loadBranches(); loadRepoHistory(); if (pathB) loadGitHistory(pathB); setGitTab(pathB ? 'file' : 'branches'); setPickingType('refB'); }}><GitBranch className="h-3 w-3" /></Button>
                                        </div>
                                    )}
                                    {modeB === 'history' && (
                                        <div className="relative w-40">
                                            <Input placeholder="Snapshot..." value={pathB.startsWith('.history/') ? pathB.substring(9) : '...'} readOnly className="h-9 text-sm pr-8" />
                                            <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-2" onClick={() => { if (!pathB) alert("Pick file B first"); else { loadHistory(pathB); setPickingType('histB'); } }}><ChronosLogo width={12} height={12} className="h-3 w-3" /></Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Compact bar when header is hidden */
                <div className="h-14 border-b bg-background flex items-center justify-between px-8 flex-shrink-0 shadow-md animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm font-black text-primary uppercase"><ArrowRightLeft className="h-5 w-5" /> Full-Screen</div>
                        <div className="h-5 w-px bg-border" />
                        <div className="text-[11px] font-bold opacity-60 uppercase truncate max-w-2xl flex items-center gap-2">
                            <span className="text-muted-foreground">{getRelativePath(pathA)}</span>
                            <ArrowRightLeft className="h-3 w-3 opacity-30" />
                            <span>{getRelativePath(pathB)}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {diffData && modeB === 'working' && editableContent !== diffData.modified && (
                            <Button variant="default" size="sm" className="h-9 px-6 bg-green-600 hover:bg-green-700 text-white font-bold gap-2 shadow-lg animate-in zoom-in" onClick={handleSave} disabled={isSaving}><Save className={`h-4 w-4 ${isSaving ? 'animate-pulse' : ''}`} />{isSaving ? 'Saving...' : 'Save Changes'}</Button>
                        )}
                        <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-bold uppercase border-primary/20 text-primary hover:bg-primary/5" onClick={() => setIsHeaderVisible(true)}><Minimize2 className="h-4 w-4" /> Restore Controls</Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => onOpenChange(false)}><X className="h-5 w-5" /></Button>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 relative flex flex-col min-h-0">
                {/* Search pickers overlays */}
                {pickingType && (
                    <div className="absolute inset-0 bg-background/95 z-[110] p-6 animate-in fade-in duration-200 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex flex-col gap-1">
                                <h3 className="font-bold uppercase tracking-widest text-xs opacity-70">{pickingType.startsWith('file') ? 'Select File' : pickingType.startsWith('ref') ? 'Select Git' : 'Select Snapshot'}</h3>
                                {pickingType.startsWith('ref') && (
                                    <div className="flex bg-muted/50 p-1 rounded-lg mt-2">
                                        <button onClick={() => setGitTab('branches')} className={`px-4 py-1.5 text-[10px] uppercase font-bold rounded-md ${gitTab === 'branches' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'}`}>Branches</button>
                                        <button onClick={() => setGitTab('file')} className={`px-4 py-1.5 text-[10px] uppercase font-bold rounded-md ${gitTab === 'file' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'}`}>File History</button>
                                        <button onClick={() => setGitTab('repo')} className={`px-4 py-1.5 text-[10px] uppercase font-bold rounded-md ${gitTab === 'repo' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'}`}>Repo History</button>
                                    </div>
                                )}
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setPickingType(null)}><X className="h-4 w-4" /></Button>
                        </div>
                        <Command className="rounded-lg border shadow-xl overflow-hidden h-full flex flex-col bg-background">
                            <CommandInput placeholder="Search..." autoFocus className="h-12" />
                            <CommandList className="flex-1 overflow-y-auto p-2">
                                <CommandEmpty>No results found.</CommandEmpty>
                                {(pickingType === 'refA' || pickingType === 'refB') && (
                                    <>
                                        {gitTab === 'branches' && <CommandGroup heading="Branches">{branches.map(b => (<CommandItem key={b.name + b.commitId} onSelect={() => handleSelect(b.name || b.commitId)} className="flex items-center gap-2 cursor-pointer p-3 hover:bg-muted"><GitBranch className={`h-4 w-4 ${b.isCurrentRepositoryHead ? 'text-primary' : 'text-muted-foreground'}`} /><div className="flex flex-col"><span className="text-sm font-medium">{b.name || b.commitId.substring(0, 7)}</span><span className="text-[10px] opacity-50 font-mono">{b.commitId.substring(0, 7)}</span></div></CommandItem>))}</CommandGroup>}
                                        {gitTab === 'file' && <CommandGroup heading="Commits">{gitHistory.map(c => (<CommandItem key={c.id} onSelect={() => handleSelect(c.id)} className="flex items-center gap-2 cursor-pointer p-3 hover:bg-muted"><ChronosLogo width={16} height={16} className="h-4 w-4 text-muted-foreground" /><div className="flex flex-col"><span className="text-sm font-medium">{c.message}</span><div className="flex items-center gap-2 text-[10px] opacity-50"><span className="font-mono bg-muted px-1 rounded">{c.id.substring(0, 7)}</span><span>• {c.author}</span></div></div></CommandItem>))}</CommandGroup>}
                                        {gitTab === 'repo' && <CommandGroup heading="All Commits">{repoHistory.map(c => (<CommandItem key={c.id} onSelect={() => handleSelect(c.id)} className="flex items-center gap-2 cursor-pointer p-3 hover:bg-muted"><ChronosLogo width={16} height={16} className="h-4 w-4 text-primary/50" /><div className="flex flex-col"><span className="text-sm font-medium">{c.message}</span><div className="flex items-center gap-2 text-[10px] opacity-50"><span className="font-mono bg-muted px-1 rounded">{c.id.substring(0, 7)}</span><span>• {c.author}</span></div></div></CommandItem>))}</CommandGroup>}
                                    </>
                                )}
                                {pickingType.startsWith('file') && <CommandGroup heading="Files">{files.map(f => (<CommandItem key={f} onSelect={() => handleSelect(f)} className="flex items-center gap-2 cursor-pointer p-3 hover:bg-muted"><FileText className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{f}</span></CommandItem>))}</CommandGroup>}
                                {pickingType.startsWith('hist') && <CommandGroup heading="Snapshots">{historySnapshots.map(s => (<CommandItem key={s.id} onSelect={() => handleSelect(`.history/${s.storagePath || s.id}`)} className="flex items-center gap-2 cursor-pointer p-3 hover:bg-muted"><ChronosLogo width={16} height={16} className="h-4 w-4 text-orange-500" /><div className="flex flex-col"><span className="text-sm font-medium">{s.label || s.eventType}</span><span className="text-[10px] opacity-50">{new Date(s.timestamp).toLocaleString()}</span></div></CommandItem>))}</CommandGroup>}
                            </CommandList>
                        </Command>
                    </div>
                )}

                {loading ? (
                    <div className="flex-1 flex items-center justify-center bg-muted/5">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="text-sm font-bold uppercase tracking-[0.2em] animate-pulse text-muted-foreground">Building comparison...</p>
                        </div>
                    </div>
                ) : diffData ? (
                    <div className="flex-1 flex flex-col min-h-0 bg-background">
                        {/* Editor Toolbar */}
                        <div className="px-8 py-2 bg-muted/30 border-b flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase bg-muted/50 px-2 py-1 rounded">
                                    <FileText className="h-3 w-3" /> {getRelativePath(pathA)} {refA ? `(${refA.substring(0,7)})` : '(Working)'}
                                </div>
                                <ArrowRightLeft className="h-3 w-3 text-muted-foreground/30" />
                                <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase bg-primary/5 px-2 py-1 rounded">
                                    <FileEdit className="h-3 w-3" /> {getRelativePath(pathB)} {refB ? `(${refB.substring(0,7)})` : '(Working)'}
                                    {editableContent !== diffData.modified && <span className="bg-orange-500 text-white px-1.5 py-0.5 rounded-sm ml-2 animate-pulse">MODIFIED</span>}
                                </div>
                            </div>
                            <div className="text-[10px] font-black text-muted-foreground/40 uppercase">{modeB === 'working' ? 'EDITABLE' : 'READ-ONLY'}</div>
                        </div>
                        {/* THE DIFF VIEW: This must fill every available pixel */}
                        <div className="flex-1 min-h-0 relative">
                            <DiffView original={diffData.original} modified={editableContent || ''} renderSideBySide={true} language={getLanguageFromPath(pathB)} readOnly={modeB !== 'working'} onChange={(val) => setEditableContent(val || '')} />
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
                        <MousePointer2 className="h-16 w-16 mb-6 opacity-10 animate-bounce" />
                        <h3 className="text-2xl font-black opacity-30 uppercase tracking-widest">Select Sources</h3>
                        <p className="text-sm opacity-40 mb-8 max-w-xs text-center font-medium">Select your code sources above and click Start Comparison.</p>
                        <Button size="lg" className="rounded-full px-12 h-14 shadow-xl font-black text-lg gap-3" onClick={handleCompare}>
                            <ArrowRightLeft className="h-5 w-5" /> Start Comparison
                        </Button>
                    </div>
                )}
            </div>

            {/* Footer section (Collapsible) */}
            {isHeaderVisible && (
                <div className="px-8 py-4 border-t bg-muted/5 flex-shrink-0 flex flex-row justify-end gap-3 shadow-[0_-1px_10px_rgba(0,0,0,0.05)]">
                    {diffData && modeB === 'working' && editableContent !== diffData.modified && (
                        <Button variant="default" className="h-10 px-8 bg-green-600 hover:bg-green-700 text-white font-bold gap-2 mr-auto shadow-lg" onClick={handleSave} disabled={isSaving}>
                            <Save className={`h-4 w-4 ${isSaving ? 'animate-pulse' : ''}`} />
                            {isSaving ? 'Saving...' : 'Save to Disk'}
                        </Button>
                    )}
                    <Button variant="outline" className="h-10 px-6 font-semibold shadow-sm" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button className="h-10 px-10 shadow-xl font-black bg-primary text-primary-foreground rounded-md active:scale-95 transition-transform" onClick={handleCompare} disabled={loading}>
                        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : "Run Comparison"}
                    </Button>
                </div>
            )}
        </div>
    );
}
