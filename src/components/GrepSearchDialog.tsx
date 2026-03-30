'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { grepHistory, semanticSearch, getLog, rebuildIndex, indexedSearch, getSearchSnippet } from '@/lib/electron';

...

export default function GrepSearchDialog({ open, onOpenChange, repoPath, onCommitSelect, onFileSelect }: GrepSearchDialogProps) {
    const [pattern, setPattern] = useState('');
    const [userFilter, setUserFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchMode, setSearchMode] = useState<'grep' | 'semantic' | 'indexed'>('grep');
    const [isIndexing, setIsIndexing] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [previewContent, setPreviewContent] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    const handleSearch = async () => {
        if (!pattern || !repoPath) return;
        setLoading(true);
        setSelectedId(null);
        setPreviewContent(null);
        try {
            if (searchMode === 'grep') {
                const parsed = await grepHistory(repoPath, pattern, userFilter, startDate, endDate);
                setResults(parsed);
            } else if (searchMode === 'indexed') {
                const { files, snapshots } = await indexedSearch(pattern, userFilter, startDate, endDate);
                setResults([
                    ...files.map(f => ({ ...f, type: 'file', id: f.path })),
                    ...snapshots.map(s => ({ ...s, type: 'snapshot' }))
                ]);
            } else {
                await handleSemanticSearch();
            }
        } catch (e) {
            console.error(e);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleResultClick = async (item: any) => {
        const id = item.id || item.path;
        setSelectedId(id);
        
        if (item.snippet) {
            setPreviewContent(item.snippet);
            return;
        }

        if (item.type === 'git' && item.files?.length > 0) {
            setPreviewLoading(true);
            try {
                // Get snippet for the first changed file in the commit
                const snippet = await getSearchSnippet(repoPath, item.id, pattern, item.files[0]);
                setPreviewContent(snippet || "No preview available for this commit.");
            } catch (e) {
                setPreviewContent("Error loading preview.");
            } finally {
                setPreviewLoading(false);
            }
        } else {
            setPreviewContent(null);
        }
    };

    const handleResultDoubleClick = (item: any) => {
        if (item.type === 'file') {
            onFileSelect?.(item.path);
        } else {
            onCommitSelect(item);
        }
        onOpenChange(false);
    };

...

    const renderResults = () => {
        if (results.length === 0 && !loading) {
            return (
                <div className="text-center text-muted-foreground py-16 flex flex-col items-center gap-4 opacity-50">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                        {searchMode === 'grep' ? <Search className="h-8 w-8" /> : searchMode === 'semantic' ? <Sparkles className="h-8 w-8" /> : <Hash className="h-8 w-8" />}
                    </div>
                    <div className="max-w-xs mx-auto">
                        <p className="font-bold text-sm uppercase tracking-wider mb-1">No results yet</p>
                        <p className="text-xs">
                            {searchMode === 'grep' 
                                ? "Enter a regex pattern to deep search Git history." 
                                : searchMode === 'indexed'
                                ? "Search current files and local history instantly."
                                : "Use natural language to search for intent across commits."}
                        </p>
                    </div>
                </div>
            );
        }

        return results.map((item, idx) => {
            const itemId = item.id || item.path;
            const isSelected = selectedId === itemId;

            if (item.type === 'file') {
                return (
                    <div 
                        key={`file-${idx}`} 
                        className={`p-4 rounded-xl border bg-background hover:border-blue-500/50 hover:shadow-md cursor-pointer transition-all group relative overflow-hidden ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                        onClick={() => handleResultClick(item)}
                        onDoubleClick={() => handleResultDoubleClick(item)}
                    >
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-xs font-mono text-blue-500 font-bold bg-blue-500/5 px-2 py-0.5 rounded uppercase">
                                <FileText className="h-3 w-3" />
                                Working File
                            </div>
                        </div>
                        <div className="text-sm font-bold truncate">{highlightMatch(item.path, pattern)}</div>
                    </div>
                );
            }

            const isSnapshot = item.type === 'snapshot';
            const colorClass = isSnapshot ? 'text-orange-500' : 'text-primary';
            const bgColorClass = isSnapshot ? 'bg-orange-500/5' : 'bg-primary/5';
            const barColorClass = isSnapshot ? 'bg-orange-500' : 'bg-primary';

            return (
                <div 
                    key={item.id} 
                    className={`p-4 rounded-xl border bg-background hover:border-${isSnapshot ? 'orange-500' : 'primary'}/50 hover:shadow-md cursor-pointer transition-all group relative overflow-hidden ${isSelected ? `ring-2 ring-${isSnapshot ? 'orange-500' : 'primary'} border-${isSnapshot ? 'orange-500' : 'primary'}` : ''}`}
                    onClick={() => handleResultClick(item)}
                    onDoubleClick={() => handleResultDoubleClick(item)}
                >
                    <div className={`absolute top-0 left-0 w-1 h-full ${barColorClass} opacity-0 group-hover:opacity-100 transition-opacity`} />
                    <div className="flex items-center justify-between mb-2">
                        <div className={`flex items-center gap-2 text-xs font-mono ${colorClass} font-bold ${bgColorClass} px-2 py-0.5 rounded`}>
                            {isSnapshot ? <History className="h-3 w-3" /> : <Hash className="h-3 w-3" />}
                            {isSnapshot ? 'Local Snapshot' : item.id.substring(0, 7)}
                        </div>
                        {item.date && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                                <Calendar className="h-3 w-3" />
                                {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                        )}
                    </div>
                    <div className="text-sm font-bold mb-2 group-hover:text-primary transition-colors leading-tight">
                        {highlightMatch(item.message, pattern)}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                            <User className="h-3 w-3" />
                            {highlightMatch(item.author || 'Local User', userFilter)}
                        </div>
                    </div>
                </div>
            );
        });
    };

    const handleSemanticSearch = async () => {
        try {
            const apiKey = localStorage.getItem('ai_api_key') || '';
            const model = localStorage.getItem('ai_model') || 'gemini-1.5-flash';
            const context = localStorage.getItem('ai_context') || '';
            
            // 1. Get recent history to search through (top 200 for more breadth when filtering)
            let log = await getLog(repoPath, 200);
            
            // Apply local filters before sending to AI if they are set
            if (userFilter) {
                log = log.filter(c => c.author.toLowerCase().includes(userFilter.toLowerCase()));
            }
            if (startDate) {
                const sDate = new Date(startDate);
                log = log.filter(c => new Date(c.timestamp) >= sDate);
            }
            if (endDate) {
                const eDate = new Date(endDate);
                log = log.filter(c => new Date(c.timestamp) <= eDate);
            }

            // 2. Ask AI to find relevant IDs
            const relevantIds = await semanticSearch(pattern, log, apiKey, model, context);
            
            // 3. Filter log to only show relevant ones
            setResults(log.filter(c => relevantIds.includes(c.id)));
        } catch (e) {
            console.error("Semantic search failed:", e);
            throw e;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[750px] flex flex-col p-0 overflow-hidden bg-background border-primary/20 shadow-2xl">
                <div className="p-6 border-b bg-muted/5 flex items-center justify-between">
                    <div>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Search className="h-5 w-5 text-primary" />
                            History Search
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Find relevant versions using patterns or AI intent. Single-click to preview, double-click to open.
                        </DialogDescription>
                    </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 pt-4">
                        <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as any)} className="w-full">
                            <TabsList className="grid w-full grid-cols-3 mb-4 bg-muted/50 p-1">
                                <TabsTrigger value="grep" className="gap-2">
                                    <Search className="h-3 w-3" /> Deep Grep
                                </TabsTrigger>
                                <TabsTrigger value="indexed" className="gap-2">
                                    <Hash className="h-3 w-3" /> Indexed
                                </TabsTrigger>
                                <TabsTrigger value="semantic" className="gap-2">
                                    <Sparkles className="h-3 w-3" /> Semantic
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="space-y-3 mb-6">
                            <div className="flex gap-2">
                                <div className="relative flex-1 group">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input 
                                        placeholder={searchMode === 'grep' ? "Regex or string (e.g. functionName)..." : searchMode === 'indexed' ? "Keywords (instant search)..." : "Describe what you're looking for..."} 
                                        className="pl-10 h-11 border-muted-foreground/20 focus:border-primary/50 transition-all"
                                        value={pattern}
                                        onChange={e => setPattern(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                    />
                                </div>
                                <Button 
                                    variant={showFilters ? 'secondary' : 'outline'}
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="h-11 px-3"
                                    title="Toggle Filters"
                                    disabled={results.length === 0 && !loading && !showFilters}
                                >
                                    <Calendar className="h-4 w-4" />
                                </Button>
                                <Button onClick={handleSearch} disabled={loading || !pattern} size="lg" className="h-11 px-6 font-bold shadow-lg shadow-primary/20">
                                    {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Search'}
                                </Button>
                                {searchMode === 'indexed' && (
                                    <Button variant="outline" onClick={handleRebuild} disabled={isIndexing} size="lg" className="h-11 px-4 gap-2 border-primary/20 hover:bg-primary/5">
                                        <RefreshCw className={`h-4 w-4 ${isIndexing ? 'animate-spin' : ''}`} />
                                        {isIndexing ? 'Indexing...' : 'Rebuild'}
                                    </Button>
                                )}
                            </div>

                            {showFilters && (
                                <div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/20">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                            <User className="h-3 w-3" /> Author
                                        </label>
                                        <Input placeholder="User name..." className="h-8 text-xs" value={userFilter} onChange={e => setUserFilter(e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                            <Calendar className="h-3 w-3" /> Start Date
                                        </label>
                                        <Input type="date" className="h-8 text-xs" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                            <Calendar className="h-3 w-3" /> End Date
                                        </label>
                                        <Input type="date" className="h-8 text-xs" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 flex min-h-0 border-t">
                        <div className="w-1/2 border-r">
                            <ScrollArea className="h-full w-full">
                                <div className="p-4 space-y-3">
                                    {renderResults()}
                                </div>
                            </ScrollArea>
                        </div>
                        <div className="w-1/2 bg-muted/10">
                            {previewLoading ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                                    <p className="text-xs font-medium animate-pulse">Fetching context preview...</p>
                                </div>
                            ) : previewContent ? (
                                <div className="h-full flex flex-col">
                                    <div className="px-4 py-2 border-b bg-muted/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                                        Context Preview
                                        <span className="text-[9px] lowercase font-normal opacity-70">Showing surrounding lines</span>
                                    </div>
                                    <ScrollArea className="flex-1">
                                        <div className="p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all">
                                            {highlightMatch(previewContent, pattern)}
                                        </div>
                                    </ScrollArea>
                                    <div className="p-3 border-t bg-muted/5">
                                        <p className="text-[10px] text-muted-foreground italic">Double-click the result to open this version.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/40 gap-4 p-8 text-center">
                                    <div className="p-4 rounded-full bg-muted/20">
                                        <FileText className="h-10 w-10 opacity-20" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold uppercase tracking-tight mb-1">Preview Pane</p>
                                        <p className="text-xs max-w-[200px]">Select a result from the list to see where the text was found.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
