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

  // Group by date? For now just flat list
  
  return (
    <div className="space-y-1 p-2">
      {snapshots.map((snapshot) => (
        <div
          key={snapshot.id}
          className={`flex flex-col p-2 rounded cursor-pointer text-sm border transition-colors group relative ${
            selectedSnapshotId === snapshot.id 
              ? 'bg-primary/10 border-primary/20' 
              : pinnedId === snapshot.id
              ? 'bg-orange-500/10 border-orange-500/20'
              : 'hover:bg-muted border-transparent hover:border-border'
          }`}
          onClick={() => onSnapshotClick(snapshot)}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 font-medium truncate pr-6">
                <span className={`p-1 rounded-full ${pinnedId === snapshot.id ? 'bg-orange-500/20 text-orange-500' : 'bg-muted/50 text-muted-foreground'}`}>
                    {getEventIcon(snapshot.eventType)}
                </span>
                <span className="truncate" title={snapshot.label || snapshot.eventType}>
                    {snapshot.label || (snapshot.eventType === 'save' ? 'Auto Save' : snapshot.eventType)}
                </span>
            </div>
            <span className="text-[10px] text-muted-foreground flex-shrink-0 whitespace-nowrap ml-2 group-hover:hidden">
                {formatDate(snapshot.timestamp)}
            </span>
            
            <button 
                className={`absolute right-2 top-2 p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity ${pinnedId === snapshot.id ? 'text-orange-500 opacity-100' : 'text-muted-foreground'}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onPinClick(snapshot);
                }}
                title={pinnedId === snapshot.id ? "Unpin Base Version" : "Pin as Base Version for Comparison"}
            >
                {pinnedId === snapshot.id ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
            </button>
          </div>
          
          {(snapshot.description) && (
             <div className="text-xs text-muted-foreground truncate pl-7" title={snapshot.description}>
                {snapshot.description}
             </div>
          )}

          {/* Stats if available */}
          {(snapshot.linesAdded !== undefined || snapshot.linesDeleted !== undefined) && (
              <div className="flex gap-2 text-[10px] pl-7 mt-1 opacity-70">
                  {snapshot.linesAdded ? <span className="text-green-500">+{snapshot.linesAdded}</span> : null}
                  {snapshot.linesDeleted ? <span className="text-red-500">-{snapshot.linesDeleted}</span> : null}
              </div>
          )}
        </div>
      ))}
    </div>
  );
}
