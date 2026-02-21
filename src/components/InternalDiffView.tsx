'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { computeDiff, alignDiffChanges } from '@/lib/simpleDiff';
import { ScrollArea } from '@/components/ui/scroll-area';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css'; // or prism-okaidia
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-yaml';

interface InternalDiffViewProps {
    original: string;
    modified: string;
    language?: string;
    renderSideBySide?: boolean;
}

const highlight = (code: string, lang: string) => {
    // Map generic languages to Prism aliases
    const prismLang = Prism.languages[lang] || Prism.languages.plaintext;
    return Prism.highlight(code || '', prismLang, lang || 'plaintext');
};

export default function InternalDiffView({ original, modified, language = 'plaintext', renderSideBySide = true }: InternalDiffViewProps) {
    const changes = useMemo(() => computeDiff(original, modified), [original, modified]);
    const alignedRows = useMemo(() => alignDiffChanges(changes), [changes]);
    
    const leftRef = useRef<HTMLDivElement>(null);
    const rightRef = useRef<HTMLDivElement>(null);
    const isSyncingLeft = useRef(false);
    const isSyncingRight = useRef(false);

    const handleScroll = (source: 'left' | 'right') => {
        const left = leftRef.current;
        const right = rightRef.current;
        if (!left || !right) return;

        if (source === 'left') {
            if (isSyncingLeft.current) {
                isSyncingLeft.current = false;
                return;
            }
            isSyncingRight.current = true;
            right.scrollTop = left.scrollTop;
            right.scrollLeft = left.scrollLeft;
        } else {
            if (isSyncingRight.current) {
                isSyncingRight.current = false;
                return;
            }
            isSyncingLeft.current = true;
            left.scrollTop = right.scrollTop;
            left.scrollLeft = right.scrollLeft;
        }
    };

    if (renderSideBySide) {
        return (
            <div className="flex h-full font-mono text-xs bg-white dark:bg-slate-950 overflow-hidden">
                <div 
                    ref={leftRef}
                    className="w-1/2 border-r flex flex-col overflow-auto scrollbar-hide"
                    onScroll={() => handleScroll('left')}
                >
                    <div className="min-w-fit">
                        {alignedRows.map((row, i) => {
                            const html = highlight(row.left?.content || '', language);
                            return (
                                <div key={i} className={`flex ${row.left?.type === 'delete' ? 'bg-red-100 dark:bg-red-900/20' : ''} h-5 w-full`}>
                                    <span className="w-8 text-right text-gray-400 select-none mr-2 bg-slate-50 dark:bg-slate-900 px-1 border-r border-transparent sticky left-0 z-10">
                                        {row.left?.originalLine || ''}
                                    </span>
                                    <span 
                                        className={`whitespace-pre flex-1 ${!row.left ? 'bg-slate-100/50 dark:bg-slate-800/50' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: html }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div 
                    ref={rightRef}
                    className="w-1/2 flex flex-col overflow-auto"
                    onScroll={() => handleScroll('right')}
                >
                    <div className="min-w-fit">
                        {alignedRows.map((row, i) => {
                            const html = highlight(row.right?.content || '', language);
                            return (
                                <div key={i} className={`flex ${row.right?.type === 'insert' ? 'bg-green-100 dark:bg-green-900/20' : ''} h-5 w-full`}>
                                    <span className="w-8 text-right text-gray-400 select-none mr-2 bg-slate-50 dark:bg-slate-900 px-1 border-r border-transparent sticky left-0 z-10">
                                        {row.right?.modifiedLine || ''}
                                    </span>
                                    <span 
                                        className={`whitespace-pre flex-1 ${!row.right ? 'bg-slate-100/50 dark:bg-slate-800/50' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: html }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // Inline View
    return (
        <div className="h-full font-mono text-xs bg-white dark:bg-slate-950 overflow-auto">
            {changes.map((change, i) => {
                let bgClass = '';
                if (change.type === 'insert') bgClass = 'bg-green-100 dark:bg-green-900/20';
                if (change.type === 'delete') bgClass = 'bg-red-100 dark:bg-red-900/20';
                
                const html = highlight(change.content, language);

                return (
                    <div key={i} className={`flex ${bgClass} h-5`}>
                        <div className="flex w-16 text-gray-400 select-none bg-slate-50 dark:bg-slate-900 border-r mr-2">
                            <span className="w-8 text-right pr-1">{change.originalLine || ''}</span>
                            <span className="w-8 text-right pr-1">{change.modifiedLine || ''}</span>
                        </div>
                        <div className="flex-1 whitespace-pre flex">
                            <span className="select-none opacity-50 mr-1 w-2 text-center">
                                {change.type === 'insert' && '+'}
                                {change.type === 'delete' && '-'}
                            </span>
                            <span dangerouslySetInnerHTML={{ __html: html }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
