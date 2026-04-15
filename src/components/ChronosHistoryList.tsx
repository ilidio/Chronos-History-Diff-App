'use client';

import { GitBranch, Save, Edit, Type, Bookmark, Trash2, Calendar, Pin, PinOff } from 'lucide-react';
import ChronosLogo from './ChronosLogo';

interface Snapshot {
    id: string;
    timestamp: number;
    filePath: string;
    eventType: 'save' | 'rename' | 'delete' | 'label' | 'manual' | 'selection';
    storagePath?: string;
    label?: string;
    description?: string;
    linesAdded?: number;
    linesDeleted?: number;
}

interface ChronosHistoryListProps {
  snapshots: Snapshot[];
  selectedSnapshotId: string | null;
  pinnedId: string | null;
  onSnapshotClick: (snapshot: Snapshot) => void;
  onPinClick: (snapshot: Snapshot) => void;
}

const getEventIcon = (type: string) => {
  switch (type) {
    case 'save': return <Save className="h-3 w-3" />;
    case 'manual': return <Bookmark className="h-3 w-3" />;
    case 'label': return <Type className="h-3 w-3" />;
    case 'rename': return <Edit className="h-3 w-3" />;
    case 'delete': return <Trash2 className="h-3 w-3" />;
    default: return <ChronosLogo width={12} height={12} className="h-3 w-3" />;
  }
};

const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
};

export default function ChronosHistoryList({ snapshots, selectedSnapshotId, pinnedId, onSnapshotClick, onPinClick }: ChronosHistoryListProps) {
  if (snapshots.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-xs italic">
        No history found for this file.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
        <table className="w-full text-left border-collapse table-fixed">
            <thead>
                <tr className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="px-3 py-2 font-semibold w-[100px]">Time</th>
                    <th className="px-3 py-2 font-semibold w-[80px]">Type</th>
                    <th className="px-3 py-2 font-semibold">Description</th>
                </tr>
            </thead>
        </table>
        <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse table-fixed">
                <tbody className="text-xs">
                    {snapshots.map((snapshot) => (
                        <tr
                            key={snapshot.id}
                            className={`group cursor-pointer border-b border-border/50 transition-colors ${
                                selectedSnapshotId === snapshot.id 
                                    ? 'bg-primary/10' 
                                    : pinnedId === snapshot.id
                                    ? 'bg-orange-500/10'
                                    : 'hover:bg-muted/50'
                            }`}
                            onClick={() => onSnapshotClick(snapshot)}
                        >
                            <td className="px-3 py-2 whitespace-nowrap text-muted-foreground w-[100px]">
                                {formatDate(snapshot.timestamp)}
                            </td>
                            <td className="px-3 py-2 w-[80px]">
                                <div className="flex items-center gap-1.5">
                                    <span className={pinnedId === snapshot.id ? 'text-orange-500' : 'text-muted-foreground'}>
                                        {getEventIcon(snapshot.eventType)}
                                    </span>
                                    <span className="capitalize opacity-80">{snapshot.eventType}</span>
                                </div>
                            </td>
                            <td className="px-3 py-2 relative overflow-hidden">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="truncate block font-medium" title={snapshot.label || snapshot.description || ''}>
                                        {snapshot.label || snapshot.description || (snapshot.eventType === 'save' ? 'Auto Save' : '-')}
                                    </span>
                                    
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {(snapshot.linesAdded !== undefined || snapshot.linesDeleted !== undefined) && (
                                            <div className="flex gap-1.5 text-[10px] opacity-70">
                                                {snapshot.linesAdded ? <span className="text-green-500">+{snapshot.linesAdded}</span> : null}
                                                {snapshot.linesDeleted ? <span className="text-red-500">-{snapshot.linesDeleted}</span> : null}
                                            </div>
                                        )}
                                        <button 
                                            className={`p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity ${pinnedId === snapshot.id ? 'text-orange-500 opacity-100' : 'text-muted-foreground'}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onPinClick(snapshot);
                                            }}
                                            title={pinnedId === snapshot.id ? "Unpin Base Version" : "Pin as Base Version for Comparison"}
                                        >
                                            {pinnedId === snapshot.id ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                                        </button>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
}
