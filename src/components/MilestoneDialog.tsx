'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { createMilestone } from '@/lib/electron';
import { Flag, Loader2, Files, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface MilestoneDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    repoPath: string;
    selectedFiles: string[];
    onSuccess: () => void;
}

export default function MilestoneDialog({ open, onOpenChange, repoPath, selectedFiles, onSuccess }: MilestoneDialogProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'form' | 'success'>('form');

    const handleCreate = async () => {
        if (!name || selectedFiles.length === 0) return;
        setLoading(true);
        try {
            await createMilestone(repoPath, name, description, selectedFiles);
            setStep('success');
            onSuccess();
        } catch (e) {
            alert("Failed to create milestone: " + e);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        onOpenChange(false);
        // Reset after animation
        setTimeout(() => {
            setStep('form');
            setName('');
            setDescription('');
        }, 300);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                {step === 'form' ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Flag className="w-5 h-5 text-primary" />
                                Create Project Milestone
                            </DialogTitle>
                            <DialogDescription>
                                Save a named snapshot of <strong>{selectedFiles.length}</strong> selected files.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Milestone Name</Label>
                                <Input 
                                    id="name" 
                                    placeholder="e.g., Before Auth Refactor" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="desc">Description (Optional)</Label>
                                <Textarea 
                                    id="desc" 
                                    placeholder="Briefly explain what this save point represents..." 
                                    value={description} 
                                    onChange={e => setDescription(e.target.value)}
                                    className="h-20"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                    <Files className="w-3 h-3" /> Selected Files
                                </Label>
                                <ScrollArea className="h-24 border rounded-md p-2 bg-muted/20">
                                    {selectedFiles.map(f => (
                                        <div key={f} className="text-[10px] truncate opacity-70 mb-1">
                                            {f.split('/').pop()} <span className="opacity-40 ml-2">{f}</span>
                                        </div>
                                    ))}
                                </ScrollArea>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={handleClose}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={loading || !name} className="gap-2">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                                Create Milestone
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <div className="py-10 flex flex-col items-center text-center animate-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Milestone Created!</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mb-6">
                            Your project-wide snapshot has been saved to the Chronos history folder.
                        </p>
                        <Button onClick={handleClose} className="w-full">Awesome</Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
