'use client';

import React, { useMemo, useRef } from 'react';
import { Gitgraph, Orientation, TemplateName } from '@gitgraph/react';
import ChronosLogo from './ChronosLogo';

interface HistoryGraphProps {
    gitHistory: any[];
    localHistory: any[];
    onCommitClick: (commit: any) => void;
    onSnapshotClick: (snapshot: any) => void;
    selectedId: string | null;
    theme?: 'light' | 'dark';
}

export default function InteractiveHistoryGraph({ 
    gitHistory, 
    localHistory, 
    onCommitClick, 
    onSnapshotClick,
    selectedId,
    theme = 'dark'
}: HistoryGraphProps) {

    // Merge and sort all events by timestamp
    const { allEvents, graphKey } = useMemo(() => {
        const events = [
            ...gitHistory.map(c => ({ 
                type: 'git' as const, 
                id: (c.id || '').trim(), 
                timestamp: new Date(c.date).getTime(),
                author: c.author,
                message: c.message,
                data: c
            })),
            ...localHistory.map(s => ({
                type: 'local' as const,
                id: (s.id || '').trim(), 
                timestamp: s.timestamp,
                author: 'You',
                message: s.label || s.eventType,
                data: s
            }))
        ];
        
        // Deduplicate by type and id strictly
        const seen = new Set<string>();
        const uniqueEvents = [];
        for (const e of events) {
            if (!e.id) continue;
            const key = `${e.type}-${e.id}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueEvents.push(e);
            }
        }

        const sorted = uniqueEvents.sort((a, b) => a.timestamp - b.timestamp);
        // Create a stable key based on the IDs and count
        const keyHash = sorted.map(e => e.id.substring(0,4)).join('') + sorted.length;
        
        return { allEvents: sorted, graphKey: `g-${keyHash}` };
    }, [gitHistory, localHistory]);

    // Generate a unique ID for this specific render call
    const renderInstanceId = useMemo(() => Math.random().toString(36).substring(7), [graphKey, selectedId]);
    
    // Track if we've already built the graph for this specific component mount/render
    const initializedRef = useRef<string | null>(null);

    if (allEvents.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground italic text-sm">
                No history to visualize yet.
            </div>
        );
    }

    return (
        <div className={`h-full w-full overflow-auto bg-background/50 p-4 ${theme === 'dark' ? 'dark' : ''}`}>
            <Gitgraph key={graphKey} options={{ 
                orientation: Orientation.VerticalReverse,
                template: TemplateName.Metro,
                author: 'Author <email@address.com>'
            }}>
                {(gitgraph: any) => {
                    // Build the graph only once per "renderInstanceId"
                    if (initializedRef.current === renderInstanceId) return;
                    initializedRef.current = renderInstanceId;

                    const main = gitgraph.branch("history");
                    
                    allEvents.forEach((event, idx) => {
                        // The hash MUST be unique across all renders to avoid React key collisions
                        const commitHash = `${event.type}-${event.id}-${idx}-${renderInstanceId}`;
                        
                        if (event.type === 'git') {
                            main.commit({
                                hash: commitHash,
                                subject: event.message,
                                author: event.author,
                                onMessageClick: () => onCommitClick(event.data),
                                onClick: () => onCommitClick(event.data),
                                style: {
                                    dot: {
                                        color: event.id === selectedId ? '#3b82f6' : '#94a3b8'
                                    }
                                }
                            });
                        } else {
                            // Local Snapshot
                            main.commit({
                                hash: commitHash,
                                subject: `[Chronos] ${event.message}`,
                                author: 'Local History',
                                onMessageClick: () => onSnapshotClick(event.data),
                                onClick: () => onSnapshotClick(event.data),
                                style: {
                                    dot: {
                                        color: event.id === selectedId ? '#f59e0b' : '#fcd34d',
                                        strokeWidth: 2
                                    },
                                    message: {
                                        color: '#f59e0b',
                                        font: 'italic 12pt Calibri'
                                    }
                                }
                            });
                        }
                    });
                }}
            </Gitgraph>
        </div>
    );
}
