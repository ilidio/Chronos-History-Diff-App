
'use client';

import { useState, useEffect } from 'react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Save, Trash, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Template {
    id: string;
    name: string;
    content: string;
}

interface TemplateSelectorProps {
    onSelect: (content: string) => void;
}

export default function TemplateSelector({ onSelect }: TemplateSelectorProps) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newContent, setNewContent] = useState('');

    useEffect(() => {
        const saved = localStorage.getItem('commitTemplates');
        if (saved) {
            try { setTemplates(JSON.parse(saved)); } catch {}
        } else {
            // Default templates
            setTemplates([
                { id: '1', name: 'Feature', content: 'feat: ' },
                { id: '2', name: 'Fix', content: 'fix: ' },
                { id: '3', name: 'Breaking', content: 'feat!: ' },
                { id: '4', name: 'Chore', content: 'chore: ' },
            ]);
        }
    }, []);

    const saveTemplates = (newTemplates: Template[]) => {
        setTemplates(newTemplates);
        localStorage.setItem('commitTemplates', JSON.stringify(newTemplates));
    };

    const handleCreate = () => {
        if (!newName || !newContent) return;
        saveTemplates([...templates, { id: Date.now().toString(), name: newName, content: newContent }]);
        setNewName('');
        setNewContent('');
        setIsCreating(false);
    };

    const handleDelete = (id: string) => {
        saveTemplates(templates.filter(t => t.id !== id));
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" title="Commit Templates">
                    <FileText className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
                <div className="space-y-2">
                    <div className="font-medium text-xs flex justify-between items-center px-1">
                        <span>Templates</span>
                        <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setIsCreating(!isCreating)}>
                            <Plus className="h-3 w-3" />
                        </Button>
                    </div>
                    
                    {isCreating && (
                        <div className="bg-muted p-2 rounded space-y-2">
                            <Input 
                                placeholder="Name (e.g. Bug Fix)" 
                                className="h-6 text-xs" 
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                            />
                            <Textarea 
                                placeholder="Template Content" 
                                className="h-12 text-xs min-h-[40px]" 
                                value={newContent}
                                onChange={e => setNewContent(e.target.value)}
                            />
                            <Button size="sm" className="w-full h-6 text-xs" onClick={handleCreate} disabled={!newName || !newContent}>
                                Save
                            </Button>
                        </div>
                    )}

                    <ScrollArea className="h-48">
                        <div className="space-y-1">
                            {templates.map(t => (
                                <div key={t.id} className="flex items-center justify-between group hover:bg-muted rounded px-2 py-1 cursor-pointer">
                                    <span 
                                        className="text-xs truncate flex-1" 
                                        onClick={() => onSelect(t.content)}
                                        title={t.content}
                                    >
                                        {t.name}
                                    </span>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-4 w-4 opacity-0 group-hover:opacity-100 text-destructive"
                                        onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                                    >
                                        <Trash className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </PopoverContent>
        </Popover>
    );
}
