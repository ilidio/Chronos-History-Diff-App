// src/components/AboutDialog.tsx
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ChronosLogo from './ChronosLogo';
import { ExternalLink } from 'lucide-react';

interface AboutDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appVersion: string;
}

export default function AboutDialog({ open, onOpenChange, appVersion }: AboutDialogProps) {
    const appName = "Chronos History Diff App"; // Derived from productName
    const authorName = "Ilídio Martins";
    const authorEmail = "ilidio.martins@gmail.com";
    const vscodeExtensionLink = "https://marketplace.visualstudio.com/items?itemName=IldioMartins.chronos-history";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader className="flex items-center text-center">
                    <ChronosLogo width={64} height={64} className="mb-4" />
                    <DialogTitle className="text-2xl font-bold">{appName}</DialogTitle>
                    <DialogDescription className="text-sm">Version {appVersion}</DialogDescription>
                </DialogHeader>
                
                <div className="text-center space-y-3 mt-4">
                    <p className="text-sm">
                        Developed by <span className="font-semibold">{authorName}</span>
                        <br />
                        <a href={`mailto:${authorEmail}`} className="text-primary hover:underline">{authorEmail}</a>
                    </p>

                    <p className="text-sm pt-2">
                        Companion to the VS Code Extension:
                        <br />
                        <Button variant="link" asChild className="p-0 h-auto text-primary">
                            <a href={vscodeExtensionLink} target="_blank" rel="noopener noreferrer">
                                Chronos History VS Code Extension <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                        </Button>
                    </p>

                    <p className="text-xs text-muted-foreground pt-4">
                        Efficiently track and compare file changes across local history and Git.
                    </p>
                </div>

                <div className="pt-6 mt-6 border-t flex flex-col items-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4 opacity-60">
                        A product of
                    </p>
                    <img 
                        src="/m0k4_tools.png" 
                        alt="M0K4 Tools" 
                        className="h-10 w-auto opacity-70 hover:opacity-100 transition-all duration-300 grayscale hover:grayscale-0 cursor-default"
                    />
                </div>

                <div className="flex justify-center mt-6">
                    <Button onClick={() => onOpenChange(false)} variant="outline" className="min-w-24">Close</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
