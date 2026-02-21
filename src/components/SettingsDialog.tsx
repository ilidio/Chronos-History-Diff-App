import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getConfig, setConfig } from '@/lib/electron';
import { Save, Loader2, User, Wrench, Sparkles, Monitor } from 'lucide-react';

interface SettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    repoPath: string;
}

export default function SettingsDialog({ open, onOpenChange, repoPath }: SettingsDialogProps) {
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Tools
    const [diffTool, setDiffTool] = useState('');

    // AI
    const [aiProvider, setAiProvider] = useState('gemini');
    const [aiApiKey, setAiApiKey] = useState('');
    const [aiModel, setAiModel] = useState('gemini-3-flash-preview');
    const [aiContext, setAiContext] = useState('');

    // Display / Editor
    const [fontSize, setFontSize] = useState(13);
    const [tabSize, setTabSize] = useState(4);
    const [ignoreWhitespace, setIgnoreWhitespace] = useState(true);

    const loadSettings = async () => {
        if (!repoPath || !open) return;
        setLoading(true);
        try {
            const config = await getConfig(repoPath);
            const lines = config.split('\n');
            let name = '';
            let email = '';
            let tool = '';

            for (const line of lines) {
                if (line.startsWith('user.name=')) name = line.substring(10);
                if (line.startsWith('user.email=')) email = line.substring(11);
                if (line.startsWith('diff.tool=')) tool = line.substring(10);
            }
            setUserName(name);
            setUserEmail(email);
            setDiffTool(tool);

            // Load AI settings from localStorage
            setAiProvider(localStorage.getItem('ai_provider') || 'gemini');
            setAiApiKey(localStorage.getItem('ai_api_key') || '');
            setAiModel(localStorage.getItem('ai_model') || 'gemini-3-flash-preview');
            setAiContext(localStorage.getItem('ai_context') || '');

            // Load Display settings
            setFontSize(parseInt(localStorage.getItem('editor_font_size') || '13'));
            setTabSize(parseInt(localStorage.getItem('editor_tab_size') || '4'));
            setIgnoreWhitespace(localStorage.getItem('diff_ignore_whitespace') !== 'false');

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, [open, repoPath]);

    const handleSaveUser = async () => {
        try {
            await setConfig(repoPath, 'user.name', userName);
            await setConfig(repoPath, 'user.email', userEmail);
            alert('User identity saved to Git config!');
        } catch (e) {
            alert('Failed to save identity');
        }
    };

    const handleSaveAI = () => {
        localStorage.setItem('ai_provider', aiProvider);
        localStorage.setItem('ai_api_key', aiApiKey);
        localStorage.setItem('ai_model', aiModel);
        localStorage.setItem('ai_context', aiContext);
        alert('AI settings saved!');
    };

    const handleSaveDisplay = () => {
        localStorage.setItem('editor_font_size', fontSize.toString());
        localStorage.setItem('editor_tab_size', tabSize.toString());
        localStorage.setItem('diff_ignore_whitespace', ignoreWhitespace.toString());
        alert('Display preferences saved!');
        window.location.reload(); // Refresh to apply Monaco changes
    };

    const handleSaveTool = async (tool: string) => {
        setDiffTool(tool);
        try {
            await setConfig(repoPath, 'diff.tool', tool);
            alert(`External diff tool set to ${tool}`);
        } catch (e) {
            alert('Failed to save tool config');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl min-h-[500px] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wrench className="w-5 h-5" />
                        Application Settings
                    </DialogTitle>
                    <DialogDescription>Configure your workspace, AI assistant, and editor preferences.</DialogDescription>
                </DialogHeader>
                
                {loading ? (
                    <div className="flex-1 flex items-center justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
                ) : (
                    <Tabs defaultValue="ai" className="w-full flex-1 flex flex-col">
                        <TabsList className="grid w-full grid-cols-4 mb-6">
                            <TabsTrigger value="ai"><Sparkles className="w-4 h-4 mr-2" /> AI Assistant</TabsTrigger>
                            <TabsTrigger value="user"><User className="w-4 h-4 mr-2" /> Identity</TabsTrigger>
                            <TabsTrigger value="display"><Monitor className="w-4 h-4 mr-2" /> Display</TabsTrigger>
                            <TabsTrigger value="tools"><Wrench className="w-4 h-4 mr-2" /> Diff Tools</TabsTrigger>
                        </TabsList>

                        <div className="flex-1">
                            <TabsContent value="ai" className="space-y-4 animate-in fade-in duration-300">
                                <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border">
                                    <div>
                                        <h3 className="font-bold text-sm">Gemini AI Configuration</h3>
                                        <p className="text-[10px] text-muted-foreground">Powers code reviews and daily work briefings.</p>
                                    </div>
                                    {process.env.NEXT_PUBLIC_GEMINI_API_KEY && (
                                        <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-1 rounded-full border border-green-500/20 flex items-center gap-1 font-bold">
                                            <Sparkles className="w-3 h-3" /> System Config Active
                                        </span>
                                    )}
                                </div>
                                
                                <div className="space-y-3 px-1">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-sm font-medium">Provider</Label>
                                        <select 
                                            className="col-span-3 flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                            value={aiProvider}
                                            onChange={(e) => setAiProvider(e.target.value)}
                                        >
                                            <option value="gemini">Google Gemini (Recommended)</option>
                                            <option value="openai">OpenAI (GPT)</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-sm font-medium">API Key</Label>
                                        <Input 
                                            type="password"
                                            value={aiApiKey} 
                                            onChange={e => setAiApiKey(e.target.value)} 
                                            className="col-span-3 h-10" 
                                            placeholder="Enter your key..." 
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-sm font-medium">Model</Label>
                                        <Input 
                                            value={aiModel} 
                                            onChange={e => setAiModel(e.target.value)} 
                                            className="col-span-3 h-10 font-mono text-xs" 
                                            placeholder="gemini-3-flash-preview" 
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 gap-4">
                                        <Label className="text-sm font-medium pt-2">Custom Context</Label>
                                        <Textarea 
                                            value={aiContext} 
                                            onChange={e => setAiContext(e.target.value)} 
                                            className="col-span-3 h-24 text-xs" 
                                            placeholder="E.g., 'Be concise. Focus on security and performance.'" 
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4 border-t">
                                    <Button onClick={handleSaveAI} className="gap-2"><Save className="w-4 h-4" /> Save AI Assistant</Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="user" className="space-y-4 animate-in fade-in duration-300">
                                <div className="bg-muted/30 p-3 rounded-lg border">
                                    <h3 className="font-bold text-sm">Git Identity</h3>
                                    <p className="text-[10px] text-muted-foreground">Used to highlight your contributions in the history logs.</p>
                                </div>
                                <div className="space-y-4 px-1">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-sm font-medium">Name</Label>
                                        <Input value={userName} onChange={e => setUserName(e.target.value)} className="col-span-3 h-10" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-sm font-medium">Email</Label>
                                        <Input value={userEmail} onChange={e => setUserEmail(e.target.value)} className="col-span-3 h-10" />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4 border-t">
                                    <Button onClick={handleSaveUser} className="gap-2"><Save className="w-4 h-4" /> Save Identity</Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="display" className="space-y-4 animate-in fade-in duration-300">
                                <div className="bg-muted/30 p-3 rounded-lg border">
                                    <h3 className="font-bold text-sm">Editor & Diff View</h3>
                                    <p className="text-[10px] text-muted-foreground">Adjust how code and differences are rendered.</p>
                                </div>
                                <div className="space-y-4 px-1">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-sm font-medium">Font Size</Label>
                                        <div className="col-span-3 flex items-center gap-4">
                                            <input 
                                                type="range" min="10" max="24" 
                                                value={fontSize} 
                                                onChange={(e) => setFontSize(parseInt(e.target.value))}
                                                className="flex-1"
                                            />
                                            <span className="w-8 text-center font-mono font-bold text-sm">{fontSize}px</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-sm font-medium">Tab Size</Label>
                                        <select 
                                            className="col-span-3 flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                            value={tabSize}
                                            onChange={(e) => setTabSize(parseInt(e.target.value))}
                                        >
                                            <option value={2}>2 Spaces</option>
                                            <option value={4}>4 Spaces</option>
                                            <option value={8}>8 Spaces</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-sm font-medium">Whitespace</Label>
                                        <div className="col-span-3 flex items-center gap-2">
                                            <input 
                                                type="checkbox" 
                                                checked={ignoreWhitespace} 
                                                onChange={(e) => setIgnoreWhitespace(e.target.checked)}
                                                className="h-4 w-4 rounded border-primary"
                                            />
                                            <span className="text-sm">Ignore leading/trailing whitespace in diffs</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4 border-t">
                                    <Button onClick={handleSaveDisplay} className="gap-2"><Save className="w-4 h-4" /> Save Preferences</Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="tools" className="space-y-4 animate-in fade-in duration-300">
                                <div className="bg-muted/30 p-3 rounded-lg border">
                                    <h3 className="font-bold text-sm">External Comparison Tools</h3>
                                    <p className="text-[10px] text-muted-foreground">Specify which application to use for complex diffs.</p>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4 px-1">
                                    <Label className="text-sm font-medium">Diff Tool</Label>
                                    <select 
                                        className="col-span-3 flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                        value={diffTool}
                                        onChange={(e) => handleSaveTool(e.target.value)}
                                    >
                                        <option value="">System Default</option>
                                        <option value="vscode">VS Code (code --diff)</option>
                                        <option value="kdiff3">KDiff3</option>
                                        <option value="meld">Meld</option>
                                        <option value="bc3">Beyond Compare 3</option>
                                    </select>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
}
