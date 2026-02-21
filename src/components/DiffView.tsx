'use client';

import { DiffEditor, loader } from '@monaco-editor/react';
import { useEffect, useState, useRef } from 'react';

// Initialize Monaco once
if (typeof window !== 'undefined') {
  import('monaco-editor').then((monaco) => {
    loader.config({ monaco });
  });
}

interface DiffViewProps {
  original: string;
  modified: string;
  language?: string;
  originalLanguage?: string;
  modifiedLanguage?: string;
  theme?: 'vs-light' | 'vs-dark';
  renderSideBySide?: boolean;
  id?: string; // Unique ID for model paths
  onChange?: (value: string | undefined) => void;
  onSelectionChange?: (range: { startLine: number, endLine: number, triggerSearch?: boolean, searchText?: string, triggerCompare?: boolean } | null) => void;
  readOnly?: boolean;
}

export default function DiffView({ 
    original, 
    modified, 
    language = 'plaintext',
    originalLanguage,
    modifiedLanguage,
    theme = 'vs-light',
    renderSideBySide = true,
    id = 'default',
    onChange,
    onSelectionChange,
    readOnly = false
}: DiffViewProps) {
  const [mounted, setMounted] = useState(false);
  const editorRef = useRef<any>(null);
  const modelsRef = useRef<{ original: any, modified: any } | null>(null);

  // Load Preferences from localStorage
  const preferences = useRef({
      fontSize: 13,
      tabSize: 4,
      ignoreWhitespace: true
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
        preferences.current = {
            fontSize: parseInt(localStorage.getItem('editor_font_size') || '13'),
            tabSize: parseInt(localStorage.getItem('editor_tab_size') || '4'),
            ignoreWhitespace: localStorage.getItem('diff_ignore_whitespace') !== 'false'
        };
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;
    loader.init().then(() => {
      if (!isCancelled) {
        setMounted(true);
      }
    });
    return () => {
      isCancelled = true;
      // Cleanup models on unmount
      if (modelsRef.current) {
        const { original: o, modified: m } = modelsRef.current;
        // IMPORTANT: Reset editor model before disposing the models
        if (editorRef.current) {
          try {
            // Standard Monaco way to detach models from a diff editor
            editorRef.current.setModel(null);
          } catch (e) {
            // Editor might already be disposed
          }
        }
        
        o?.dispose();
        m?.dispose();
        modelsRef.current = null;
      }
    };
  }, []);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Apply tab size to the model creation if possible, or via options
    monaco.editor.getModels().forEach((model: any) => {
        model.updateOptions({ tabSize: preferences.current.tabSize });
    });

    // Create manual models
    const originalModel = monaco.editor.createModel(original || '', originalLanguage || language);
    const modifiedModel = monaco.editor.createModel(modified || '', modifiedLanguage || language);
    
    originalModel.updateOptions({ tabSize: preferences.current.tabSize });
    modifiedModel.updateOptions({ tabSize: preferences.current.tabSize });

    editor.setModel({
      original: originalModel,
      modified: modifiedModel
    });

    modelsRef.current = {
      original: originalModel,
      modified: modifiedModel
    };

    // Listen for changes in the modified editor
    const modifiedEditor = editor.getModifiedEditor();
    modifiedEditor.onDidChangeModelContent(() => {
        if (onChange) {
            onChange(modifiedEditor.getValue());
        }
    });

    // Listen for selection changes in both editors
    const handleSelection = () => {
        if (!onSelectionChange) return;
        
        const selection = editor.getModifiedEditor().getSelection() || editor.getOriginalEditor().getSelection();
        if (selection && !selection.isEmpty()) {
            onSelectionChange({
                startLine: selection.startLineNumber,
                endLine: selection.endLineNumber
            });
        } else {
            onSelectionChange(null);
        }
    };

    editor.getModifiedEditor().onDidChangeCursorSelection(handleSelection);
    editor.getOriginalEditor().onDidChangeCursorSelection(handleSelection);

    // Add Context Menu Actions
    const addActions = (ed: any) => {
        ed.addAction({
            id: 'chronos-selection-history',
            label: 'Show History for Selection',
            contextMenuGroupId: 'navigation',
            contextMenuOrder: 1,
            run: () => {
                const selection = ed.getSelection();
                if (selection && !selection.isEmpty()) {
                    if (onSelectionChange) {
                        onSelectionChange({
                            startLine: selection.startLineNumber,
                            endLine: selection.endLineNumber,
                            triggerSearch: true // Signal to page.tsx to auto-trigger
                        });
                    }
                }
            }
        });

        ed.addAction({
            id: 'chronos-search-text',
            label: 'Search this text in History',
            contextMenuGroupId: 'navigation',
            contextMenuOrder: 2,
            run: () => {
                const model = ed.getModel();
                const selection = ed.getSelection();
                const text = model.getValueInRange(selection);
                if (text && onSelectionChange) {
                    onSelectionChange({
                        startLine: selection.startLineNumber,
                        endLine: selection.endLineNumber,
                        searchText: text,
                        triggerSearch: true
                    });
                }
            }
        });

        ed.addAction({
            id: 'chronos-compare-selection',
            label: 'Compare Selection with...',
            contextMenuGroupId: 'navigation',
            contextMenuOrder: 3,
            run: () => {
                const selection = ed.getSelection();
                if (selection && !selection.isEmpty()) {
                    if (onSelectionChange) {
                        onSelectionChange({
                            startLine: selection.startLineNumber,
                            endLine: selection.endLineNumber,
                            triggerCompare: true
                        });
                    }
                }
            }
        });
    };

    addActions(editor.getModifiedEditor());
    addActions(editor.getOriginalEditor());
  };

  // Update model content when props change
  useEffect(() => {
    if (modelsRef.current) {
      const { original: originalModel, modified: modifiedModel } = modelsRef.current;
      if (originalModel.getValue() !== original) {
        originalModel.setValue(original || '');
      }
      if (modifiedModel.getValue() !== modified) {
        modifiedModel.setValue(modified || '');
      }
    }
  }, [original, modified]);

  if (!mounted) return (
      <div className="h-full flex items-center justify-center bg-muted/10 border rounded-md text-xs text-muted-foreground min-h-[300px]">
          Initializing editor...
      </div>
  );

  const hasConflicts = modified.includes('<<<<<<<') && modified.includes('=======') && modified.includes('>>>>>>>');

  return (
    <div className="h-full border rounded-md overflow-hidden bg-background flex flex-col">
      {hasConflicts && (
          <div className="bg-destructive text-destructive-foreground px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-center">
              Merge Conflicts Detected
          </div>
      )}
      <div className="flex-1 relative h-full w-full min-h-[300px]">
        <DiffEditor
            height="100%"
            width="100%"
            theme={theme}
            onMount={handleEditorDidMount}
            options={{
                readOnly: readOnly,
                fontSize: preferences.current.fontSize,
                ignoreTrimWhitespace: preferences.current.ignoreWhitespace,
                minimap: { enabled: false },
                renderSideBySide: renderSideBySide,
                automaticLayout: true,
                scrollBeyondLastLine: false,
                originalEditable: false,
                diffCodeLens: false,
                renderIndicators: true,
                scrollbar: {
                    vertical: 'visible',
                    horizontal: 'visible',
                    useShadows: false,
                    verticalHasArrows: false,
                    horizontalHasArrows: false,
                    verticalScrollbarSize: 10,
                    horizontalScrollbarSize: 10
                },
                fixedOverflowWidgets: true,
                renderOverviewRuler: false,
                folding: true,
                lineNumbers: 'on',
                glyphMargin: true,
                useInlineViewWhenSpaceIsLimited: false
            }}
        />
      </div>
    </div>
  );
}
