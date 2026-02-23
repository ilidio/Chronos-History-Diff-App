'use client';

import { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';

export interface FileEntry {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
  path: string; // Full absolute path
}

interface ExplorerTreeProps {
  files: FileEntry[];
  selectedFile: string | null;
  onFileClick: (path: string) => void;
  rootPath: string; // To calculate relative paths
}

interface TreeNode {
  name: string;
  path: string;
  children: Record<string, TreeNode>;
  isDir: boolean;
  fileChildren: FileEntry[];
}

const buildTree = (files: FileEntry[], rootPath: string): TreeNode => {
  const normalizedRootPath = rootPath.replace(/\\/g, '/');
  const root: TreeNode = { name: 'root', path: normalizedRootPath, children: {}, isDir: true, fileChildren: [] };

  files.forEach(file => {
    const normalizedFilePath = file.path.replace(/\\/g, '/');
    // Calculate relative path from root
    let relativePath = normalizedFilePath;
    if (normalizedFilePath.startsWith(normalizedRootPath)) {
        relativePath = normalizedFilePath.substring(normalizedRootPath.length);
        if (relativePath.startsWith('/')) {
            relativePath = relativePath.substring(1);
        }
    }
    
    const parts = relativePath.split('/').filter(p => p);
    let current = root;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current.children[part]) {
        current.children[part] = { 
          name: part, 
          path: current.path + '/' + part, 
          children: {}, 
          isDir: true, 
          fileChildren: [] 
        };
      }
      current = current.children[part];
    }

    const fileName = parts[parts.length - 1];
    if (file.isDirectory) {
        if (!current.children[fileName]) {
            current.children[fileName] = { 
                name: fileName, 
                path: file.path, 
                children: {}, 
                isDir: true, 
                fileChildren: [] 
            };
        }
    } else {
        current.fileChildren.push(file);
    }
  });

  return root;
};

export default function ExplorerTree({ files, selectedFile, onFileClick, rootPath }: ExplorerTreeProps) {
  const tree = useMemo(() => buildTree(files, rootPath), [files, rootPath]);
  const [expandCollapseToken, setExpandCollapseToken] = useState<string | null>(null);

  const expandAll = () => setExpandCollapseToken('expand');
  const collapseAll = () => setExpandCollapseToken('collapse');

  return (
    <div className="text-sm select-none">
      <div className="flex gap-2 p-1">
        <button onClick={expandAll} className="text-xs text-muted-foreground hover:text-foreground">Expand All</button>
        <button onClick={collapseAll} className="text-xs text-muted-foreground hover:text-foreground">Collapse All</button>
      </div>
      <TreeItem 
        node={tree} 
        level={0} 
        selectedFile={selectedFile} 
        onFileClick={onFileClick}
        isRoot={true}
        expandCollapseToken={expandCollapseToken}
      />
    </div>
  );
}

interface TreeItemProps {
    node: TreeNode;
    level: number;
    selectedFile: string | null;
    onFileClick: (path: string) => void;
    isRoot?: boolean;
    expandCollapseToken: string | null;
}

function TreeItem({ node, level, selectedFile, onFileClick, isRoot = false, expandCollapseToken }: TreeItemProps) {
  const [isOpen, setIsOpen] = useState(isRoot || level < 1); 

  useEffect(() => {
    if (expandCollapseToken === 'expand') {
      setIsOpen(true);
    } else if (expandCollapseToken === 'collapse' && !isRoot) {
      setIsOpen(false);
    }
  }, [expandCollapseToken, isRoot]);

  const hasContent = Object.keys(node.children).length > 0 || node.fileChildren.length > 0;

  const FolderHeader = (
    <div
      className="flex items-center py-1 group cursor-pointer hover:bg-muted/50 rounded-sm px-1"
      style={{ paddingLeft: `${level * 12}px` }}
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="w-4 h-4 flex items-center justify-center mr-1 text-muted-foreground">
        {hasContent && (isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
      </div>
      {isOpen ? <FolderOpen className="h-4 w-4 mr-2 text-blue-400" /> : <Folder className="h-4 w-4 mr-2 text-blue-400" />}
      <span className="truncate font-medium">{node.name}</span>
    </div>
  );

  return (
    <div>
      {!isRoot && FolderHeader}

      {(isOpen || isRoot) && (
        <div>
          {Object.values(node.children)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((childNode) => (
              <TreeItem
                key={childNode.path}
                node={childNode}
                level={isRoot ? level : level + 1}
                selectedFile={selectedFile}
                onFileClick={onFileClick}
                expandCollapseToken={expandCollapseToken}
              />
          ))}

          {node.fileChildren
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((file) => (
            <div
              key={file.path}
              className={`flex items-center py-1 group cursor-pointer rounded-sm px-1 ${selectedFile === file.path ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
              style={{ paddingLeft: `${(isRoot ? level : level + 1) * 12 + 20}px` }}
              onClick={() => onFileClick(file.path)}
            >
              <File className="h-3 w-3 mr-2 flex-shrink-0 opacity-70" />
              <span className="truncate">{file.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
