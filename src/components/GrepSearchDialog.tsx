'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { grepHistory, semanticSearch, getLog } from '@/lib/electron';
import { Search, Loader2, Calendar, User, Hash, Sparkles } from 'lucide-react';

interface GrepSearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    repoPath: string;
    onCommitSelect: (commit: any) => void;
}

export default function GrepSearchDialog({ open, onOpenChange, repoPath, onCommitSelect }: GrepSearchDialogProps) {
    const [pattern, setPattern] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchMode, setSearchMode] = useState<'grep' | 'semantic'>('grep');

    const handleSearch = async () => {
        if (!pattern || !repoPath) return;
        setLoading(true);
        try {
            if (searchMode === 'grep') {
                const output = await grepHistory(repoPath, pattern);
                const parsed = output.split('\n').filter((l: string) => l && l.includes('|')).map((line: string) => {
                    const [id, author, date, message] = line.split('|');
                    return { id, author, date, message };
                });
                setResults(parsed);
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

    const renderResults = () => {
        if (results.length === 0 && !loading) {
            return (
                <div className="text-center text-muted-foreground py-16 flex flex-col items-center gap-4 opacity-50">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                        {searchMode === 'grep' ? <Search className="h-8 w-8" /> : <Sparkles className="h-8 w-8" />}
                    </div>
                    <div className="max-w-xs mx-auto">
                        <p className="font-bold text-sm uppercase tracking-wider mb-1">No results yet</p>
                        <p className="text-xs">
                            {searchMode === 'grep' 
                                ? "Enter a regex pattern to deep search file contents." 
                                : "Use natural language to search for intent across commits."}
                        </p>
                    </div>
                </div>
            );
        }

        return results.map((commit) => (
            <div 
                key={commit.id} 
                className="p-4 rounded-xl border bg-background hover:border-primary/50 hover:shadow-md cursor-pointer transition-all group relative overflow-hidden"
                onClick={() => {
                    onCommitSelect(commit);
                    onOpenChange(false);
                }}
            >
                <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-primary font-bold bg-primary/5 px-2 py-0.5 rounded">
                        <Hash className="h-3 w-3" />
                        {commit.id.substring(0, 7)}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                        <Calendar className="h-3 w-3" />
                        {new Date(commit.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                </div>
                <div className="text-sm font-bold mb-2 group-hover:text-primary transition-colors leading-tight">{commit.message}</div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        <User className="h-3 w-3" />
                        {commit.author}
                    </div>
                    {searchMode === 'semantic' && (
                        <span className="text-[10px] text-primary/60 font-black uppercase tracking-widest italic animate-pulse">Semantic Match</span>
                    )}
                </div>
            </div>
        ));
    };

    const handleSemanticSearch = async () => {
        try {
            const apiKey = localStorage.getItem('ai_api_key') || '';
            const model = localStorage.getItem('ai_model') || 'gemini-1.5-flash';
            const context = localStorage.getItem('ai_context') || '';
            
            // 1. Get recent history to search through (top 100 for balance)
            const log = await getLog(repoPath, 100);
            
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
            <DialogContent className="max-w-3xl h-[650px] flex flex-col p-0 overflow-hidden bg-background border-primary/20 shadow-2xl">
                <div className="p-6 border-b bg-muted/5 flex items-center justify-between">
                    <div>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Search className="h-5 w-5 text-primary" />
                            History Search
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Find relevant versions using patterns or AI intent.
                        </DialogDescription>
                    </div>
                </div>

                <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as any)} className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 pt-2">
                        <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50 p-1">
                            <TabsTrigger value="grep" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                <Search className="h-3 w-3" /> Deep Grep
                            </TabsTrigger>
                            <TabsTrigger value="semantic" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary">
                                <Sparkles className="h-3 w-3" /> Semantic Search
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex gap-2 mb-6">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input 
                                    placeholder={searchMode === 'grep' ? "Regex or string (e.g. functionName)..." : "Describe what you're looking for (e.g. login fix)..."} 
                                    className="pl-10 h-11 border-muted-foreground/20 focus:border-primary/50 transition-all"
                                    value={pattern}
                                    onChange={e => setPattern(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                />
                            </div>
                            <Button onClick={handleSearch} disabled={loading || !pattern} size="lg" className="h-11 px-6 font-bold shadow-lg shadow-primary/20">
                                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Search'}
                            </Button>
                        </div>
                    </div>

                    <TabsContent value="grep" className="flex-1 min-h-0 m-0 border-t outline-none data-[state=inactive]:hidden">
                        <ScrollArea className="h-full w-full">
                            <div className="p-6 space-y-3">
                                {renderResults()}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="semantic" className="flex-1 min-h-0 m-0 border-t outline-none data-[state=inactive]:hidden">
                        <ScrollArea className="h-full w-full">
                            <div className="p-6 space-y-3">
                                {renderResults()}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
