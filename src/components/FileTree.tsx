'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen, Trash, Eye, Archive, ArrowRightLeft } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from '@/components/ui/context-menu';

interface FileTreeProps {
    files: any[];
    selectedFile: string | null;
    onFileClick: (path: string) => void;
    onToggleStage?: (file: any) => void;
    viewMode: 'workdir' | 'commit';
    onResolve?: (file: any) => void;
    onIgnore?: (path: string) => void;
    onHistory?: (path: string) => void;
    onCompare?: (path: string) => void;
    onDelete?: (path: string) => void;
    onRename?: (oldPath: string, newPath: string) => void;
    onStash?: (path: string) => void;
    onDiscard?: (path: string, isStaged?: boolean) => void;
    checked?: boolean; // Forced checkbox state
}

interface TreeNode {
    name: string;
    path: string;
    children: Record<string, TreeNode>;
    files: any[];
    fileData?: any; // For when a directory itself is a status item
}

export default function FileTree({ files, selectedFile, onFileClick, onToggleStage, viewMode, onResolve, onIgnore, onHistory, onCompare, onDelete, onRename, onStash, onDiscard, checked }: FileTreeProps) {
    const buildTree = (files: any[]) => {
        const root: TreeNode = { name: '', path: '', children: {}, files: [] };
        files.forEach(file => {
            const isDir = file.path.endsWith('/');
            // Normalize path separator and filter empty parts
            const normalizedPath = file.path.replace(/\\/g, '/');
            const parts = normalizedPath.split('/').filter((p: string) => p.length > 0);
            
            let current = root;
            let currentPath = '';
            
            // Walk the tree
            // If it's a dir item (ends in /), we process ALL parts to find/create the folder node
            // If it's a file item, we process all but the last part
            const walkDepth = isDir ? parts.length : parts.length - 1;

            for (let i = 0; i < walkDepth; i++) {
                const part = parts[i];
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                if (!current.children[part]) {
                    current.children[part] = { name: part, path: currentPath, children: {}, files: [] };
                }
                current = current.children[part];
            }

            if (isDir) {
                // This node IS the status item
                current.fileData = file;
            } else {
                current.files.push(file);
            }
        });
        return root;
    };

    const tree = buildTree(files);

    return (
        <div className="text-xs">
            <TreeItem 
                node={tree} 
                level={0} 
                selectedFile={selectedFile} 
                onFileClick={onFileClick} 
                onToggleStage={onToggleStage}
                viewMode={viewMode}
                onResolve={onResolve}
                onIgnore={onIgnore}
                onHistory={onHistory}
                onCompare={onCompare}
                onDelete={onDelete}
                onRename={onRename}
                onStash={onStash}
                onDiscard={onDiscard}
                checked={checked}
                isRoot
            />
        </div>
    );
}

function TreeItem({ node, level, selectedFile, onFileClick, onToggleStage, viewMode, onResolve, onIgnore, onHistory, onCompare, onDelete, onRename, onStash, onDiscard, checked, isRoot = false }: any) {
    const [isOpen, setIsOpen] = useState(true);

    const hasContent = Object.keys(node.children).length > 0 || node.files.length > 0;
    
    // If this folder node has fileData, it means it's a status item itself (e.g. untracked dir)
    const file = node.fileData;
    const isStaged = checked !== undefined ? checked : (file ? (file.status.includes("Index") || file.status === "Staged") : false);
    const isConflicted = file ? file.status.includes("Conflicted") : false;

    // Folder Header Component
    const FolderHeader = (
        <div 
            className={`flex items-center py-1 px-2 group cursor-pointer rounded select-none sticky top-0 bg-background z-10 ${file && selectedFile === file.path ? 'bg-primary/10 border-primary/20' : 'hover:bg-muted'}`}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={(e) => {
                // If it's a status item, clicking selects it. Otherwise toggles open.
                // Actually standard behavior: arrow toggles, name toggles? 
                // Let's make: Arrow always toggles. Name: if status item -> select, else toggle.
                if (file) onFileClick(file.path);
                else setIsOpen(!isOpen);
            }}
        >
            <div 
                className="w-4 h-4 flex items-center justify-center mr-1"
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
            >
                {hasContent ? (
                    isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
                ) : null}
            </div>
            
            {viewMode === 'workdir' && file && (
                 <Checkbox 
                     checked={isStaged}
                     onCheckedChange={() => onToggleStage?.(file)}
                     onClick={(e) => e.stopPropagation()} 
                     className="h-3 w-3 mr-2"
                 />
            )}

            {isOpen ? (
                <FolderOpen className="h-3.5 w-3.5 mr-2 text-blue-400 fill-blue-400/20" />
            ) : (
                <Folder className="h-3.5 w-3.5 mr-2 text-blue-400 fill-blue-400/20" />
            )}
            
            <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                <span className={`font-medium truncate ${isConflicted ? 'text-destructive' : ''}`}>{node.name}</span>
                {file && (
                     <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[8px] uppercase font-bold px-1 rounded ${isConflicted ? 'bg-destructive/10 text-destructive' : 'bg-muted-foreground/10 text-muted-foreground'}`}>
                            {file.status.charAt(0)}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div>
            {!isRoot && (
                file ? (
                    <ContextMenu>
                        <ContextMenuTrigger asChild>
                            {FolderHeader}
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                            <ContextMenuItem onClick={() => onIgnore?.(file.path)}>
                                <Eye className="w-3 h-3 mr-2" /> Add to .gitignore
                            </ContextMenuItem>
                            {viewMode === 'workdir' && (
                                <>
                                    <ContextMenuItem onClick={() => onStash?.(file.path)}>
                                        <Archive className="w-3 h-3 mr-2" /> Stash This
                                    </ContextMenuItem>
                                    <ContextMenuItem onClick={() => onDiscard?.(file.path, isStaged)} className="text-destructive focus:text-destructive">
                                        <Trash className="w-3 h-3 mr-2" /> Discard Changes
                                    </ContextMenuItem>
                                </>
                            )}
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={() => onDelete?.(file.path)}>
                                <Trash className="w-3 h-3 mr-2" /> Delete File (git rm)
                            </ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>
                ) : (
                    FolderHeader
                )
            )}

            {isOpen && (
                <div>
                    {Object.values(node.children).sort((a: any, b: any) => a.name.localeCompare(b.name)).map((child: any) => (
                        <TreeItem 
                            key={child.path} 
                            node={child} 
                            level={isRoot ? level : level + 1} 
                            selectedFile={selectedFile} 
                            onFileClick={onFileClick}
                            onToggleStage={onToggleStage}
                            viewMode={viewMode}
                            onResolve={onResolve}
                            onIgnore={onIgnore}
                            onHistory={onHistory}
                            onCompare={onCompare}
                            onDelete={onDelete}
                            onRename={onRename}
                            onStash={onStash}
                            onDiscard={onDiscard}
                            checked={checked}
                        />
                    ))}
                    {node.files.sort((a: any, b: any) => a.path.localeCompare(b.path)).map((file: any) => {
                        const isDir = file.path.endsWith('/');
                        const fileName = file.path.replace(/\/$/, '').split('/').pop();
                        const isStaged = checked !== undefined ? checked : (file.status.includes("Index") || file.status === "Staged");
                        const isConflicted = file.status.includes("Conflicted");

                        return (
                            <ContextMenu key={file.path}>
                                <ContextMenuTrigger asChild>
                                    <div 
                                        className={`flex items-center py-1 px-2 group cursor-pointer rounded border border-transparent ${selectedFile === file.path ? 'bg-primary/10 border-primary/20' : 'hover:bg-muted'}`}
                                        style={{ paddingLeft: `${(isRoot ? level : level + 1) * 12 + 8}px` }}
                                        onClick={() => onFileClick(file.path)}
                                    >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            {viewMode === 'workdir' && (
                                                <Checkbox 
                                                    checked={isStaged}
                                                    onCheckedChange={() => onToggleStage?.(file)}
                                                    onClick={(e) => e.stopPropagation()} 
                                                    className="h-3 w-3"
                                                />
                                            )}
                                            {isDir ? (
                                                <Folder className="h-3.5 w-3.5 flex-shrink-0 text-blue-400 fill-blue-400/20" />
                                            ) : (
                                                <FileText className={`h-3.5 w-3.5 flex-shrink-0 ${isConflicted ? 'text-destructive' : 'text-muted-foreground'}`} />
                                            )}
                                            <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                                                <span className={`truncate ${isConflicted ? 'text-destructive font-semibold' : ''}`}>{fileName}</span>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {isConflicted && onResolve && (
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="h-4 text-[8px] px-1 bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onResolve(file);
                                                            }}
                                                        >
                                                            Resolve
                                                        </Button>
                                                    )}
                                                    <span className={`text-[8px] uppercase font-bold px-1 rounded ${isConflicted ? 'bg-destructive/10 text-destructive' : 'bg-muted-foreground/10 text-muted-foreground'}`}>
                                                        {file.status.charAt(0)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                    <ContextMenuItem onClick={() => onIgnore?.(file.path)}>
                                        <Eye className="w-3 h-3 mr-2" /> Add to .gitignore
                                    </ContextMenuItem>
                                    <ContextMenuItem onClick={() => onHistory?.(file.path)}>
                                        <FileText className="w-3 h-3 mr-2" /> File History
                                    </ContextMenuItem>
                                    <ContextMenuItem onClick={() => onCompare?.(file.path)}>
                                        <ArrowRightLeft className="w-3 h-3 mr-2" /> Compare with...
                                    </ContextMenuItem>
                                    {viewMode === 'workdir' && (
                                        <>
                                            <ContextMenuItem onClick={() => onStash?.(file.path)}>
                                                <Archive className="w-3 h-3 mr-2" /> Stash This File
                                            </ContextMenuItem>
                                            <ContextMenuItem onClick={() => onDiscard?.(file.path)} className="text-destructive focus:text-destructive">
                                                <Trash className="w-3 h-3 mr-2" /> Discard Changes
                                            </ContextMenuItem>
                                        </>
                                    )}
                                    <ContextMenuSeparator />
                                    <ContextMenuItem onClick={() => onDelete?.(file.path)}>
                                        <Trash className="w-3 h-3 mr-2" /> Delete File (git rm)
                                    </ContextMenuItem>
                                     <ContextMenuItem onClick={() => {
                                         const newName = prompt("New filename:", file.path);
                                         if (newName && newName !== file.path) {
                                             (onRename as any)?.(file.path, newName);
                                         }
                                     }}>
                                        <FileText className="w-3 h-3 mr-2" /> Rename
                                    </ContextMenuItem>
                                </ContextMenuContent>
                            </ContextMenu>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
