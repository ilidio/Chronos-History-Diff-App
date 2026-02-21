
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Calendar, Sparkles, Copy, Check } from 'lucide-react';
import { getCommitsForDate, generateDailyBrief, getConfig } from '@/lib/electron';

interface DailyBriefDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    repoPath: string;
}

export default function DailyBriefDialog({ open, onOpenChange, repoPath }: DailyBriefDialogProps) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [brief, setBrief] = useState('');
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [language, setLanguage] = useState('English');

    useEffect(() => {
        if (open) {
            setBrief('');
            setError('');
        }
    }, [open]);

    const handleGenerate = async () => {
        setLoading(true);
        setError('');
        setBrief('');

        try {
            const since = `${date} 00:00:00`;
            const until = `${date} 23:59:59`;

            const commits = await getCommitsForDate(repoPath, since, until);
            if (commits.length === 0) {
                setError('No commits found for the selected date.');
                setLoading(false);
                return;
            }

            // Get AI config from git config, env, or localStorage
            const configStr = await getConfig(repoPath).catch(() => '');
            const lines = configStr.split('\n');
            
            const gitApiKey = lines.find((l: string) => l.startsWith('ai.apikey='))?.split('=')[1];
            const gitModel = lines.find((l: string) => l.startsWith('ai.model='))?.split('=')[1];
            const gitEndpoint = lines.find((l: string) => l.startsWith('ai.endpoint='))?.split('=')[1];

            const apiKey = gitApiKey || localStorage.getItem('ai_api_key') || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
            const model = gitModel || localStorage.getItem('ai_model') || process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-1.5-flash';
            const endpoint = gitEndpoint || localStorage.getItem('ai_endpoint') || '';

            if (!apiKey) {
                setError('API Key not found. Please configure it in Settings (AI tab).');
                setLoading(false);
                return;
            }

            const summary = await generateDailyBrief(commits, apiKey, endpoint, model, language);
            setBrief(summary);
        } catch (e: any) {
            setError(e.message || 'Failed to generate briefing');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(brief);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Daily Progress Briefing
                    </DialogTitle>
                    <DialogDescription>
                        Generate an AI summary of your work for a specific day.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">
                            Date
                        </Label>
                        <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="language" className="text-right">
                            Language
                        </Label>
                        <Input
                            id="language"
                            placeholder="e.g. English, Portuguese, Japanese"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>

                <ScrollArea className="flex-grow mt-2 rounded-md border p-4 bg-muted/30">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Analyzing commits and generating summary...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-destructive">
                            <p>{error}</p>
                        </div>
                    ) : brief ? (
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                            {brief}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Calendar className="h-12 w-12 mb-4 opacity-20" />
                            <p>Select a date and click Generate</p>
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter className="mt-4">
                    {brief && (
                        <Button variant="outline" onClick={handleCopy} className="mr-auto">
                            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                            {copied ? 'Copied' : 'Copy to Clipboard'}
                        </Button>
                    ) }
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleGenerate} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generate Briefing
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
