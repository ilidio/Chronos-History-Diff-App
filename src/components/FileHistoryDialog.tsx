'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { getFileHistory } from '@/lib/electron';
import { Loader2 } from 'lucide-react';
import ChronosLogo from './ChronosLogo';

interface FileHistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    repoPath: string;
    filePath: string | null;
}

export default function FileHistoryDialog({ open, onOpenChange, repoPath, filePath }: FileHistoryDialogProps) {
    const [commits, setCommits] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedCommit, setSelectedCommit] = useState<any>(null);

    useEffect(() => {
        if (open && repoPath && filePath) {
            setLoading(true);
            getFileHistory(repoPath, filePath)
                .then(parsedCommits => {
                    setCommits(parsedCommits);
                    if (parsedCommits.length > 0) setSelectedCommit(parsedCommits[0]);
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [open, repoPath, filePath]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden gap-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <ChronosLogo width={20} height={20} className="h-5 w-5" />
                        File History: {filePath ? filePath.split(/[\\\\/]/).pop() : ''}
                    </DialogTitle>
                    <DialogDescription className="font-mono text-[10px] opacity-70 truncate">
                        {filePath}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 flex overflow-hidden">
                    {/* List Side */}
                    <div className="w-2/5 border-r flex flex-col overflow-hidden bg-muted/20">
                        <table className="w-full text-left border-collapse table-fixed bg-muted/50">
                            <thead>
                                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                                    <th className="px-3 py-2 font-semibold w-24">Date</th>
                                    <th className="px-3 py-2 font-semibold">Message</th>
                                </tr>
                            </thead>
                        </table>
                        <ScrollArea className="flex-1">
                            {loading ? (
                                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                            ) : (
                                <table className="w-full text-left border-collapse table-fixed">
                                    <tbody className="text-[11px]">
                                        {commits.map((commit) => (
                                            <tr 
                                                key={commit.id} 
                                                className={`cursor-pointer border-b border-border/50 transition-colors ${selectedCommit?.id === commit.id ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                                                onClick={() => setSelectedCommit(commit)}
                                            >
                                                <td className="px-3 py-2 w-24 text-muted-foreground whitespace-nowrap">
                                                    {new Date(commit.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </td>
                                                <td className="px-3 py-2 truncate font-medium" title={commit.message}>
                                                    {commit.message}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            {commits.length === 0 && !loading && (
                                <div className="p-8 text-center text-xs text-muted-foreground italic">No git history found.</div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Preview Side */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-background">
                        {selectedCommit ? (
                            <div className="flex flex-col h-full overflow-hidden">
                                <div className="p-3 bg-muted/30 border-b flex flex-col gap-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-primary font-mono">{selectedCommit.id.substring(0, 8)}</span>
                                        <span className="text-[10px] opacity-60">{new Date(selectedCommit.timestamp).toLocaleString()}</span>
                                    </div>
                                    <div className="text-xs font-medium">{selectedCommit.author}</div>
                                    <div className="text-xs opacity-80 italic">{selectedCommit.message}</div>
                                </div>
                                <div className="flex-1 overflow-auto p-0 bg-[#0d1117] text-gray-300 font-mono text-[11px] leading-relaxed">
                                    {selectedCommit.diff ? (
                                        <div className="p-2 space-y-0.5">
                                            {selectedCommit.diff.split('\\n').map((line, i) => {
                                                let color = '';
                                                let bg = '';
                                                if (line.startsWith('+')) { color = 'text-green-400'; bg = 'bg-green-900/20'; }
                                                else if (line.startsWith('-')) { color = 'text-red-400'; bg = 'bg-red-900/20'; }
                                                else if (line.startsWith('@@')) { color = 'text-blue-400'; bg = 'bg-blue-900/10'; }
                                                
                                                return (
                                                    <div key={i} className={`whitespace-pre px-2 ${color} ${bg} min-h-[1.2rem]`}>
                                                        {line}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-muted-foreground italic">
                                            No diff content available for this commit.
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground italic text-xs">
                                Select a commit to see details.
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="p-3 border-t bg-muted/10 flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
