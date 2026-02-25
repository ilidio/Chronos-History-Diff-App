'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { grepHistory } from '@/lib/electron';
import { Search, Loader2, Calendar, User, Hash } from 'lucide-react';

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

    const handleSearch = async () => {
        if (!pattern || !repoPath) return;
        setLoading(true);
        try {
            const output = await grepHistory(repoPath, pattern);
            const parsed = output.split('\n').filter((l: string) => l && l.includes('|')).map((line: string) => {
                const [id, author, date, message] = line.split('|');
                return { id, author, date, message };
            });
            setResults(parsed);
        } catch (e) {
            console.error(e);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl h-[600px] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Deep History Search (Grep)</DialogTitle>
                    <DialogDescription>
                        Search for commits that changed the <strong>content</strong> of files matching a pattern.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Regex or string (e.g. functionName)..." 
                            className="pl-8"
                            value={pattern}
                            onChange={e => setPattern(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <Button onClick={handleSearch} disabled={loading || !pattern}>
                        {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Search'}
                    </Button>
                </div>

                <ScrollArea className="flex-1 min-h-0 border rounded-md bg-muted/20">
                    <div className="p-2 space-y-2">
                        {results.length === 0 && !loading && (
                            <div className="text-center text-muted-foreground py-8">No results. Enter a pattern to start deep searching.</div>
                        )}
                        {results.map((commit) => (
                            <div 
                                key={commit.id} 
                                className="p-3 rounded border bg-background hover:border-primary cursor-pointer transition-colors group"
                                onClick={() => {
                                    onCommitSelect(commit);
                                    onOpenChange(false);
                                }}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2 text-xs font-mono text-primary">
                                        <Hash className="h-3 w-3" />
                                        {commit.id.substring(0, 7)}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(commit.date).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="text-sm font-medium mb-1 group-hover:text-primary transition-colors">{commit.message}</div>
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <User className="h-3 w-3" />
                                    {commit.author}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
