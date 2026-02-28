'use client';

import React from 'react';
import { formatRelativeTime } from '@/lib/utils';
import { User, Clock, HardDrive } from 'lucide-react';

interface BlameEntry {
    line: number;
    hash?: string;
    author?: string;
    authorTime?: number;
    summary?: string;
    snapshotId?: string;
    snapshotTimestamp?: number;
    snapshotLabel?: string;
}

interface BlameSidebarProps {
    blameData: BlameEntry[];
    isVisible: boolean;
    onClose: () => void;
}

export default function BlameSidebar({ blameData, isVisible, onClose }: BlameSidebarProps) {
    if (!isVisible) return null;

    return (
        <div className="w-64 border-l bg-slate-50 dark:bg-slate-900 overflow-y-auto flex flex-col font-sans">
            <div className="p-2 border-b flex items-center justify-between bg-white dark:bg-slate-950 sticky top-0 z-10">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Blame & History</span>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                    <Clock className="w-4 h-4" />
                </button>
            </div>
            <div className="flex-1">
                {blameData.map((entry, i) => {
                    const isGit = !!entry.hash;
                    const isSnapshot = !!entry.snapshotId;
                    
                    return (
                        <div key={i} className="h-5 flex items-center border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 px-2 text-[10px] group relative overflow-hidden">
                            <div className="w-4 mr-1 flex-shrink-0">
                                {isGit ? <User className="w-3 h-3 text-blue-500" /> : isSnapshot ? <HardDrive className="w-3 h-3 text-orange-500" /> : null}
                            </div>
                            <div className="truncate flex-1">
                                {isGit && (
                                    <span className="text-slate-600 dark:text-slate-400">
                                        {entry.author} • {entry.hash?.substring(0, 7)}
                                    </span>
                                )}
                                {isSnapshot && (
                                    <span className="text-orange-600 dark:text-orange-400">
                                        {entry.snapshotLabel || 'Local Snapshot'}
                                    </span>
                                )}
                                {!isGit && !isSnapshot && (
                                    <span className="text-slate-400 italic">Uncommitted</span>
                                )}
                            </div>
                            
                            {/* Hover Details */}
                            <div className="absolute inset-0 bg-white dark:bg-slate-800 hidden group-hover:flex items-center px-2 z-20 shadow-sm">
                                <span className="truncate">
                                    {isGit ? entry.summary : isSnapshot ? `Local: ${entry.snapshotLabel || 'Snapshot'}` : 'Unsaved local change'}
                                    { (entry.authorTime || entry.snapshotTimestamp) && (
                                        <span className="ml-2 opacity-60">
                                            ({formatRelativeTime(new Array(entry.authorTime ? entry.authorTime * 1000 : (entry.snapshotTimestamp || 0))[0] as number)})
                                        </span>
                                    )}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
