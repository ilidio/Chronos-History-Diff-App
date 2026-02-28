'use client';

import React, { useState, useEffect, useRef } from 'react';
import Editor, { DiffEditor, loader } from '@monaco-editor/react';
import { Button } from './ui/button';
import { Check, X, ArrowLeft, ArrowRight, Save, Info, Sparkles, Loader2 } from 'lucide-react';
import { resolveConflict } from '@/lib/electron';

interface MergeEditorProps {
    base: string;
    ours: string;
    theirs: string;
    language?: string;
    theme?: 'vs-light' | 'vs-dark';
    onSave: (result: string) => void;
    onCancel: () => void;
}

export default function MergeEditor({ 
    base, 
    ours, 
    theirs, 
    language = 'plaintext',
    theme = 'vs-dark',
    onSave,
    onCancel
}: MergeEditorProps) {
    const [result, setResult] = useState('');
    const [mounted, setMounted] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    
    // Attempt to auto-merge or use 'ours' as a starting point
    useEffect(() => {
        setResult(ours); // Simple start: use ours
    }, [ours]);

    useEffect(() => {
        loader.init().then(() => setMounted(true));
    }, []);

    const handleAcceptOurs = () => setResult(ours);
    const handleAcceptTheirs = () => setResult(theirs);

    const handleAiResolve = async () => {
        setAiLoading(true);
        try {
            const apiKey = localStorage.getItem('ai_api_key') || '';
            const model = localStorage.getItem('ai_model') || 'gemini-1.5-flash';
            const merged = await resolveConflict(base, ours, theirs, apiKey, model, 'English');
            if (merged) {
                setResult(merged);
            }
        } catch (e: any) {
            alert("AI Resolution failed: " + e.message);
        } finally {
            setAiLoading(false);
        }
    };

    if (!mounted) return <div className="p-20 text-center">Loading Merge Editor...</div>;

    return (
        <div className="flex flex-col h-full bg-background border rounded-lg overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-muted/30 border-b p-4 flex items-center justify-between">
                <div className="flex flex-col">
                    <h2 className="text-sm font-bold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        3-Way Merge Resolution
                    </h2>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                        Base version vs Local (Ours) vs Remote (Theirs)
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={handleAiResolve} 
                        className="h-8 gap-2 border border-primary/20 bg-primary/10 hover:bg-primary/20 text-primary font-bold shadow-sm"
                        disabled={aiLoading}
                    >
                        {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Resolve with Gemini
                    </Button>
                    <div className="w-px h-6 bg-border mx-1" />
                    <Button variant="outline" size="sm" onClick={onCancel} className="h-8">Cancel</Button>
                    <Button size="sm" onClick={() => onSave(result)} className="h-8 gap-2 bg-green-600 hover:bg-green-700">
                        <Save className="w-4 h-4" />
                        Save Resolution
                    </Button>
                </div>
            </div>

            {/* Editor Panes */}
            <div className="flex-1 flex min-h-0">
                {/* Left: Ours */}
                <div className="flex-1 flex flex-col border-r">
                    <div className="bg-blue-500/10 text-blue-500 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-b flex justify-between items-center">
                        Ours (Local)
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleAcceptOurs} title="Accept all from Ours">
                            <ArrowRight className="w-3 h-3" />
                        </Button>
                    </div>
                    <div className="flex-1">
                        <Editor
                            height="100%"
                            language={language}
                            theme={theme}
                            value={ours}
                            options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12 }}
                        />
                    </div>
                </div>

                {/* Middle: Result (Editable) */}
                <div className="flex-[1.5] flex flex-col border-r shadow-inner z-10 bg-background/50">
                    <div className="bg-green-500/10 text-green-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border-b flex justify-between items-center">
                        Result (Editable)
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] opacity-60 font-medium lowercase">Edit here to resolve</span>
                        </div>
                    </div>
                    <div className="flex-1">
                        <Editor
                            height="100%"
                            language={language}
                            theme={theme}
                            value={result}
                            onChange={(v) => setResult(v || '')}
                            options={{ minimap: { enabled: true }, fontSize: 13, lineNumbers: 'on', scrollBeyondLastLine: false }}
                        />
                    </div>
                </div>

                {/* Right: Theirs */}
                <div className="flex-1 flex flex-col">
                    <div className="bg-purple-500/10 text-purple-500 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-b flex justify-between items-center">
                        Theirs (Remote)
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleAcceptTheirs} title="Accept all from Theirs">
                            <ArrowLeft className="w-3 h-3" />
                        </Button>
                    </div>
                    <div className="flex-1">
                        <Editor
                            height="100%"
                            language={language}
                            theme={theme}
                            value={theirs}
                            options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12 }}
                        />
                    </div>
                </div>
            </div>

            {/* Footer with Instructions */}
            <div className="bg-muted/10 border-t p-2 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                    <Info className="w-3 h-3 text-primary" />
                    Manually edit the center panel to resolve complex conflicts.
                </div>
            </div>
        </div>
    );
}
