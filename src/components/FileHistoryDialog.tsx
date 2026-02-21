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

    useEffect(() => {
        if (open && repoPath && filePath) {
            setLoading(true);
            getFileHistory(repoPath, filePath)
                .then(output => {
                    const parsed = output.split('\n').filter((l: string) => l).map((line: string) => {
                        const [id, author, date, message] = line.split('|');
                        return { id, author, date, message };
                    });
                    setCommits(parsed);
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [open, repoPath, filePath]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                                                    <DialogTitle className="flex items-center gap-2">
                                                        <ChronosLogo width={20} height={20} className="h-5 w-5" />
                                                        History: {filePath}
                                                    </DialogTitle>                    <DialogDescription>
                        Timeline of changes for this specific file.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <div className="space-y-4 p-2">
                            {commits.length === 0 && <div className="text-center text-muted-foreground">No history found.</div>}
                            {commits.map((commit) => (
                                <div key={commit.id} className="border-l-2 border-primary pl-4 pb-4 relative">
                                    <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-background border-2 border-primary" />
                                    <div className="text-sm font-semibold">{commit.message}</div>
                                    <div className="text-xs text-muted-foreground flex gap-4 mt-1">
                                        <span className="font-mono">{commit.id.substring(0, 7)}</span>
                                        <span>{commit.author}</span>
                                        <span>{new Date(commit.date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
