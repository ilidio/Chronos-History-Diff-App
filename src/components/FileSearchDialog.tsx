'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'cmdk';
import { lsFiles } from '@/lib/electron';
import { FileText, Loader2 } from 'lucide-react';

interface FileSearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    repoPath: string;
    onSelect: (path: string) => void;
}

export default function FileSearchDialog({ open, onOpenChange, repoPath, onSelect }: FileSearchDialogProps) {
    const [files, setFiles] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && repoPath) {
            setLoading(true);
            lsFiles(repoPath)
                .then(output => setFiles(output.split('\n').filter(Boolean)))
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [open, repoPath]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 overflow-hidden max-w-2xl">
                <Command className="rounded-lg border shadow-md">
                    <CommandInput placeholder="Search files..." className="border-none focus:ring-0" />
                    <CommandList>
                        <CommandEmpty>No files found.</CommandEmpty>
                        {loading && <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div>}
                        <CommandGroup heading="Files">
                            {files.slice(0, 100).map((file) => (
                                <CommandItem 
                                    key={file} 
                                    onSelect={() => {
                                        onSelect(file);
                                        onOpenChange(false);
                                    }}
                                    className="flex items-center gap-2 cursor-pointer p-2 hover:bg-muted"
                                >
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span>{file}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </DialogContent>
        </Dialog>
    );
}
