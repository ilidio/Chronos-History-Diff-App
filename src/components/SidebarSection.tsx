import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarSectionProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    action?: React.ReactNode;
}

export default function SidebarSection({ title, children, defaultOpen = true, action }: SidebarSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="mb-2">
            <div className="flex items-center justify-between group">
                <button 
                    onClick={() => setIsOpen(!isOpen)} 
                    className="flex items-center text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors py-2 w-full text-left"
                >
                    {isOpen ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                    {title}
                </button>
                {action && <div className="opacity-0 group-hover:opacity-100 transition-opacity">{action}</div>}
            </div>
            {isOpen && (
                <div className="pl-2 border-l border-muted/40 ml-1.5">
                    {children}
                </div>
            )}
        </div>
    );
}
