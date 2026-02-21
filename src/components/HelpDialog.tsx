'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Search, Settings, History, Layout, Command, Sparkles, FileCode, ArrowRightLeft, Info,
} from 'lucide-react';

interface HelpDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
    const [activeTab, setActiveTab] = useState('basics');

    const tabNames: Record<string, string> = {
        basics: 'Basics & Navigation',
        history: 'History & Diffing',
        search: 'Search & Insights',
        shortcuts: 'Keyboard Shortcuts'
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] w-full h-[92vh] flex flex-row p-0 overflow-hidden bg-background border-none shadow-2xl">
                <div className="sr-only">
                    <DialogTitle>ChronosHistoryDiff Documentation</DialogTitle>
                    <DialogDescription>User manual and feature documentation for ChronosHistoryDiff.</DialogDescription>
                </div>
                <Tabs 
                    defaultValue="basics" 
                    value={activeTab} 
                    onValueChange={setActiveTab} 
                    className="flex flex-1 w-full h-full"
                >
                    {/* Left Sidebar Tabs - Icon Only */}
                    <TabsList className="flex flex-col w-24 h-full bg-muted/20 border-r p-4 gap-6 rounded-none justify-start">
                        <div className="mb-8 flex justify-center">
                            <div className="p-2 bg-primary rounded-xl shadow-lg shadow-primary/20">
                                <Info className="h-6 w-6 text-primary-foreground" />
                            </div>
                        </div>
                        <TabsTrigger value="basics" title="Basics" className="h-14 w-14 rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all shadow-sm">
                            <Layout className="h-6 w-6" />
                        </TabsTrigger>
                        <TabsTrigger value="history" title="History & Diffing" className="h-14 w-14 rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all shadow-sm">
                            <History className="h-6 w-6" />
                        </TabsTrigger>
                        <TabsTrigger value="search" title="Search & Insights" className="h-14 w-14 rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all shadow-sm">
                            <Search className="h-6 w-6" />
                        </TabsTrigger>
                        <TabsTrigger value="shortcuts" title="Shortcuts" className="h-14 w-14 rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all shadow-sm">
                            <Command className="h-6 w-6" />
                        </TabsTrigger>
                    </TabsList>

                    {/* Right Content Area */}
                    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
                        <header className="px-12 py-8 border-b bg-background/50 backdrop-blur-md z-10">
                            <h2 className="text-4xl font-black tracking-tight text-foreground">
                                {tabNames[activeTab]}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1 uppercase tracking-widest font-semibold">
                                ChronosHistoryDiff User Manual
                            </p>
                        </header>

                        <ScrollArea className="flex-1 h-full">
                            <div className="max-w-4xl mx-auto px-12 pt-12 pb-[15px]">
                                <TabsContent value="basics" className="space-y-16 mt-0 pb-[15px]">
                                    <section className="space-y-4">
                                        <h3 className="text-xl font-bold flex items-center gap-3">
                                            <Layout className="h-5 w-5 text-primary" /> Getting Started
                                        </h3>
                                        <div className="p-5 rounded-xl bg-muted/20 border border-muted-foreground/10">
                                            <div className="text-sm font-bold mb-2 flex items-center gap-2">
                                                <History className="h-4 w-4" /> Open Project
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Click the "Open Project" button in the sidebar or from the initial welcome screen to select a local repository folder. Chronos will automatically load your file explorer and history.
                                            </p>
                                        </div>
                                    </section>

                                    <section className="space-y-6 border-t pt-12">
                                        <h3 className="text-xl font-bold flex items-center gap-3">
                                            <Sparkles className="h-5 w-5 text-primary" /> Daily Progress Briefing
                                        </h3>
                                        <div className="p-5 rounded-xl bg-muted/20 border border-muted-foreground/10">
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Click the <Sparkles className="h-3 w-3 inline text-primary" /> button in the top right of the sidebar to generate an AI-powered summary of your daily work based on Git commits. (Requires a repository to be open).
                                            </p>
                                        </div>
                                    </section>
                                </TabsContent>

                                <TabsContent value="history" className="space-y-16 mt-0 pb-[15px]">
                                    <section className="space-y-4">
                                        <h3 className="text-xl font-bold flex items-center gap-3">
                                            <History className="h-5 w-5 text-primary" /> File History Navigation
                                        </h3>
                                        <div className="p-5 rounded-xl bg-muted/20 border border-muted-foreground/10">
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Select any file from the left-hand file explorer to view its Chronos local history snapshots and Git commit history in the main panel.
                                            </p>
                                        </div>
                                    </section>
                                    
                                    <section className="space-y-4 border-t pt-12">
                                        <h3 className="text-xl font-bold flex items-center gap-3">
                                            <FileCode className="h-5 w-5 text-primary" /> Interactive Diff Viewer
                                        </h3>
                                        <div className="grid grid-cols-1 gap-6">
                                            <div className="p-5 rounded-xl bg-muted/20 border border-muted-foreground/10">
                                                <div className="text-sm font-bold mb-2">Side-by-Side Diffs</div>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    View changes with syntax highlighting. Compare your current working file against any selected local snapshot or Git commit.
                                                </p>
                                            </div>
                                            <div className="p-5 rounded-xl bg-muted/20 border border-muted-foreground/10">
                                                <div className="text-sm font-bold mb-2">Editable Content</div>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    Make direct edits to the modified side of the diff. Click the save icon to apply changes to your working file.
                                                </p>
                                            </div>
                                            <div className="p-5 rounded-xl bg-muted/20 border border-muted-foreground/10">
                                                <div className="text-sm font-bold mb-2">Pin for Comparison</div>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    Pin any local snapshot or Git commit as a base version to continuously compare against other history entries.
                                                </p>
                                            </div>
                                            <div className="p-5 rounded-xl bg-muted/20 border border-muted-foreground/10">
                                                <div className="text-sm font-bold mb-2">Selection History</div>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    Select a range of lines in the diff view to filter the history timeline to show only relevant changes. You can also search for a specific term within your selection.
                                                </p>
                                            </div>
                                        </div>
                                    </section>
                                    
                                    <section className="space-y-4 border-t pt-12">
                                        <h3 className="text-xl font-bold flex items-center gap-3">
                                            <ArrowRightLeft className="h-5 w-5 text-primary" /> Compare Any Files
                                        </h3>
                                        <div className="p-5 rounded-xl bg-muted/20 border border-muted-foreground/10">
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Click the <ArrowRightLeft className="h-3 w-3 inline text-muted-foreground" /> button in the top right of the sidebar to open a dialog for comparing any two files in your project.
                                            </p>
                                        </div>
                                    </section>
                                </TabsContent>

                                <TabsContent value="search" className="space-y-16 mt-0 pb-[15px]">
                                    <section className="space-y-4">
                                        <h3 className="text-xl font-bold flex items-center gap-3">
                                            <Search className="h-5 w-5 text-primary" /> Deep History Search
                                        </h3>
                                        <div className="p-5 rounded-xl bg-muted/20 border border-muted-foreground/10">
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Click the <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="h-3 w-3 inline text-primary"><circle cx="8" cy="8" r="3" fill="currentColor"/><path fill="currentColor" d="M8 1C4.134 1 1 4.134 1 8c0 1.25.33 2.42.9 3.44l1.35-.78A5.5 5.5 0 0 1 2.5 8c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5-2.462 5.5-5.5 5.5a5.48 5.48 0 0 1-2.43-.57l-1.35.78A6.97 6.97 0 0 0 8 15c3.866 0 7-3.134 7-7s-3.134-7-7-7z"/><path fill="currentColor" d="M11.5 8a3.5 3.5 0 0 1-3.5 3.5 3.48 3.48 0 0 1-1.55-.36l-.87.5a4.5 4.5 0 0 0 5.92-5.92l-.87.5c.23.4.37.87.37 1.28z"/></svg> (Black Hole) icon in the top right of the sidebar to open the Grep Search dialog. Find every instance where a string was added or removed across the entire repository history.
                                            </p>
                                        </div>
                                    </section>
                                    
                                    <section className="space-y-4 border-t pt-12">
                                        <h3 className="text-xl font-bold flex items-center gap-3">
                                            <Settings className="h-5 w-5 text-primary" /> Settings
                                        </h3>
                                        <div className="p-5 rounded-xl bg-muted/20 border border-muted-foreground/10">
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Click the <Settings className="h-3 w-3 inline text-muted-foreground" /> button in the top right of the sidebar to customize various application settings.
                                            </p>
                                        </div>
                                    </section>
                                </TabsContent>

                                <TabsContent value="shortcuts" className="mt-0 pb-[15px]">
                                    <div className="grid grid-cols-1 gap-4 max-w-2xl">
                                        {[
                                            { key: 'Cmd/Ctrl + Shift + F', desc: 'Open Deep History Search (Grep)' },
                                            { key: 'Shift + ?', desc: 'Open this Help Interface' },
                                            { key: 'Esc', desc: 'Close Active Dialog' },
                                            { key: 'Cmd/Ctrl + ,', desc: 'Open Settings' },
                                        ].map(s => (
                                            <div key={s.key} className="flex justify-between items-center border-b pb-4 px-2 hover:bg-muted/10 transition-colors">
                                                <kbd className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-mono text-base border-b-4 border-primary-foreground/20 shadow-md">{s.key}</kbd>
                                                <span className="text-base font-medium text-muted-foreground">{s.desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>
                            </div>
                        </ScrollArea>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
