'use client';

import { DiffEditor, loader } from '@monaco-editor/react';
import { useEffect, useState, useRef } from 'react';
import TimeMachineSlider from './TimeMachineSlider';
import { summarizeDiff, getGitBlame, getLocalBlame, saveFile, writeFile, externalDiff, getConfig } from '@/lib/electron';
import { Sparkles, Loader2, X, MessageSquareText, UserCheck, Download, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import BlameSidebar from './BlameSidebar';
import { computeDiff } from '@/lib/simpleDiff';

// Initialize Monaco once
if (typeof window !== 'undefined') {
  import('monaco-editor').then((monaco) => {
    loader.config({ monaco });
  });
}

interface Snapshot {
    id: string;
    timestamp: number;
    filePath: string;
    eventType: 'save' | 'rename' | 'delete' | 'label' | 'manual' | 'selection';
    storagePath?: string;
    label?: string;
}

interface DiffViewProps {
  original: string;
  modified: string;
  repoPath?: string;
  filePath?: string;
  snapshots?: Snapshot[];
  language?: string;
  originalLanguage?: string;
  modifiedLanguage?: string;
  theme?: 'vs-light' | 'vs-dark';
  renderSideBySide?: boolean;
  id?: string; // Unique ID for model paths
  onChange?: (value: string | undefined) => void;
  onSelectionChange?: (range: { startLine: number, endLine: number, triggerSearch?: boolean, searchText?: string, triggerCompare?: boolean } | null) => void;
  readOnly?: boolean;
  
  // Time Machine Slider Props
  sliderProps?: {
      currentIndex: number;
      max: number;
      onChange: (index: number) => void;
      label?: string;
      timestamp?: number;
  };
}

export default function DiffView({ 
    original, 
    modified, 
    repoPath,
    filePath,
    snapshots = [],
    language = 'plaintext',
    originalLanguage,
    modifiedLanguage,
    theme = 'vs-light',
    renderSideBySide = true,
    id = 'default',
    onChange,
    onSelectionChange,
    readOnly = false,
    sliderProps
}: DiffViewProps) {
  const [mounted, setMounted] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showBlame, setShowBlame] = useState(false);
  const [blameData, setBlameData] = useState<any[]>([]);
  const [blameLoading, setBlameLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const editorRef = useRef<any>(null);
  const modelsRef = useRef<{ original: any, modified: any } | null>(null);

  const handleSummarize = async () => {
    if (!original && !modified) return;
    setAiLoading(true);
    setShowAiPanel(true);
    try {
        const apiKey = localStorage.getItem('ai_api_key') || '';
        const model = localStorage.getItem('ai_model') || 'gemini-1.5-flash';
        const context = localStorage.getItem('ai_context') || '';
        const lang = 'English'; // Could be dynamic
        
        const result = await summarizeDiff(original, modified, apiKey, model, context, lang);
        setSummary(result);
    } catch (e: any) {
        setSummary(`Error: ${e.message}`);
    } finally {
        setAiLoading(false);
    }
  };

  const handleToggleBlame = async () => {
      if (showBlame) {
          setShowBlame(false);
          return;
      }

      if (!repoPath || !filePath) return;

      setBlameLoading(true);
      setShowBlame(true);
      try {
          const [gitBlame, localBlame] = await Promise.all([
              getGitBlame(repoPath, filePath).catch(() => []),
              getLocalBlame(repoPath, filePath, modified, snapshots).catch(() => [])
          ]);

          // Merge blame data
          const lines = modified.split('\n');
          const merged: any[] = lines.map((_, i) => {
              const lineNum = i + 1;
              const git = gitBlame.find((b: any) => b.line === lineNum);
              const local = localBlame[i];
              return {
                  line: lineNum,
                  ...git,
                  ...local
              };
          });
          setBlameData(merged);
      } catch (e) {
          console.error("Failed to load blame data:", e);
      } finally {
          setBlameLoading(false);
      }
  };

  const handleExportReport = async () => {
      setExporting(true);
      try {
          const { canceled, filePath: savePath } = await saveFile('diff-report.html', [{ name: 'HTML Report', extensions: ['html'] }]);
          if (canceled || !savePath) return;

          const diffLines = computeDiff(original, modified);
          let diffHtml = '';
          diffLines.forEach((change) => {
              let cls = '';
              let sign = '&nbsp;';
              if (change.type === 'insert') { cls = 'insert'; sign = '+'; }
              else if (change.type === 'delete') { cls = 'delete'; sign = '-'; }

              diffHtml += `<div class="line ${cls}">
                  <div class="line-num">${change.originalLine || ''}</div>
                  <div class="line-num">${change.modifiedLine || ''}</div>
                  <div class="content"><span class="sign">${sign}</span>${change.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
              </div>`;
          });

          const aiSummaryHtml = summary ? `
            <div class="summary">
                <h2>AI Analysis</h2>
                <div style="white-space: pre-wrap;">${summary.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            </div>
          ` : '';

          const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chronos History Diff Report</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet" />
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
        h1 { margin: 0; font-size: 24px; color: #111; }
        .meta { color: #666; font-size: 14px; }
        .search-box { margin-bottom: 20px; position: sticky; top: 10px; z-index: 100; }
        #diff-search { width: 100%; padding: 12px 15px; border: 1px solid #ddd; border-radius: 6px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); font-size: 14px; }
        .diff-container { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; background: #fff; }
        .line { display: flex; white-space: pre; min-height: 1.5em; border-bottom: 1px solid #f0f0f0; }
        .line:last-child { border-bottom: none; }
        .line-num { width: 50px; text-align: right; padding-right: 10px; color: #999; user-select: none; background: #fafafa; border-right: 1px solid #eee; flex-shrink: 0; }
        .content { flex: 1; padding-left: 10px; overflow-x: auto; }
        .insert { background-color: #e6ffec !important; }
        .delete { background-color: #ffebe9 !important; }
        .insert .content { background-color: #ccffd8; }
        .delete .content { background-color: #ffd7d5; }
        .sign { width: 20px; display: inline-block; text-align: center; opacity: 0.5; font-weight: bold; }
        .summary { margin-top: 20px; padding: 15px; background: #f0f7ff; border-left: 4px solid #0066cc; border-radius: 0 4px 4px 0; margin-bottom: 20px; }
        .summary h2 { margin-top: 0; font-size: 16px; color: #004d99; }
        .hidden { display: none !important; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <h1>Chronos Diff Report</h1>
                <div class="meta">
                    <p><strong>File:</strong> ${filePath || 'N/A'}</p>
                    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                </div>
            </div>
            <div style="text-align: right; color: #999; font-size: 12px;">
                Generated by <a href="https://github.com/ilidio/Chronos-History-Diff-App" style="color: #0066cc;">Chronos History Diff</a>
            </div>
        </div>
        
        ${aiSummaryHtml}

        <div class="search-box">
            <input type="text" id="diff-search" placeholder="Filter diff lines by content..." autocomplete="off">
        </div>

        <div class="diff-container" id="diff-root">
            ${diffHtml}
        </div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-typescript.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-css.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js"></script>

    <script>
        // Simple search filter
        const searchInput = document.getElementById('diff-search');
        const lines = document.querySelectorAll('.line');

        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            lines.forEach(line => {
                const content = line.querySelector('.content').textContent.toLowerCase();
                if (content.includes(term)) {
                    line.classList.remove('hidden');
                } else {
                    line.classList.add('hidden');
                }
            });
        });

        // Trigger Prism highlighting manually for each line if needed, 
        // though we've just injected raw text for now.
        // For better highlighting, we should have wrapped content in <code> tags.
    </script>
</body>
</html>
          `;

          await writeFile(savePath, fullHtml);
          alert(`Report saved to: ${savePath}`);
      } catch (e: any) {
          console.error("Failed to export report:", e);
          alert(`Export failed: ${e.message}`);
      } finally {
          setExporting(false);
      }
  };

  const handleExternalDiff = async () => {
      if (!repoPath) return;
      try {
          const config = await getConfig(repoPath);
          const toolLine = config.split('\n').find((l: string) => l.startsWith('diff.tool='));
          const tool = toolLine ? toolLine.split('=')[1] : '';
          await externalDiff(original, modified, tool);
      } catch (e: any) {
          alert(`Failed to open external diff: ${e.message}`);
      }
  };

  // Clear summary when models change
  useEffect(() => {
    setSummary(null);
    setShowAiPanel(false);
    setShowBlame(false);
  }, [id, original, modified]);

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
    const addActions = (ed: any, isOriginal: boolean = false) => {
        if (isOriginal) {
            ed.addAction({
                id: 'chronos-restore-line',
                label: 'Restore this line/selection to Working Copy',
                contextMenuGroupId: 'modification',
                contextMenuOrder: 1,
                run: () => {
                    const originalModel = ed.getModel();
                    const selection = ed.getSelection();
                    const text = originalModel.getValueInRange(selection);
                    
                    const modifiedEditor = editor.getModifiedEditor();
                    const modifiedModel = modifiedEditor.getModel();
                    const modifiedSelection = modifiedEditor.getSelection();
                    
                    // Apply change to modified model at the same position or current modified selection
                    modifiedEditor.executeEdits('chronos-restore', [{
                        range: modifiedSelection,
                        text: text,
                        forceMoveMarkers: true
                    }]);
                    
                    if (onChange) {
                        onChange(modifiedModel.getValue());
                    }
                }
            });
        }

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

    addActions(editor.getModifiedEditor(), false);
    addActions(editor.getOriginalEditor(), true);
  };

  // Update model content when props change
  useEffect(() => {
    if (modelsRef.current) {
      const { original: originalModel, modified: modifiedModel } = modelsRef.current;
      
      // Prevent crash if cursor is on a line that won't exist in the new content
      if (editorRef.current) {
          editorRef.current.getOriginalEditor().setPosition({ lineNumber: 1, column: 1 });
          editorRef.current.getModifiedEditor().setPosition({ lineNumber: 1, column: 1 });
      }

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
        {/* Floating AI & Blame Triggers */}
        <div className="absolute top-4 right-10 z-10 flex flex-col items-end gap-2">
            <div className="flex gap-2">
                <Button 
                    size="sm" 
                    variant="outline"
                    className={`h-9 px-3 gap-2 shadow-lg rounded-full border bg-background/90 hover:bg-background ${showBlame ? 'border-primary text-primary' : ''}`}
                    onClick={handleToggleBlame}
                >
                    {blameLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                    Blame
                </Button>
                <Button 
                    size="sm" 
                    variant="outline"
                    className="h-9 px-3 gap-2 shadow-lg rounded-full border bg-background/90 hover:bg-background"
                    onClick={handleExternalDiff}
                >
                    <ExternalLink className="h-4 w-4" />
                    External
                </Button>
                <Button 
                    size="sm" 
                    variant="outline"
                    className="h-9 px-3 gap-2 shadow-lg rounded-full border bg-background/90 hover:bg-background"
                    onClick={handleExportReport}
                    disabled={exporting}
                >
                    {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Export
                </Button>
                {!showAiPanel && (
                    <Button 
                        size="sm" 
                        className="h-9 px-3 gap-2 shadow-lg animate-in fade-in zoom-in slide-in-from-right-2 duration-300 rounded-full border border-primary/20 bg-primary/90 hover:bg-primary"
                        onClick={handleSummarize}
                    >
                        <Sparkles className="h-4 w-4" />
                        What Changed?
                    </Button>
                )}
            </div>

            {showAiPanel && (
                <div className="w-80 bg-background/95 backdrop-blur border border-primary/20 shadow-2xl rounded-xl flex flex-col overflow-hidden animate-in fade-in zoom-in slide-in-from-right-4 duration-300">
                    <div className="p-3 border-b bg-primary/5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary">
                            <Sparkles className="h-3 w-3" />
                            AI Summary
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setShowAiPanel(false)}>
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                    
                    <ScrollArea className="max-h-[300px] overflow-y-auto">
                        <div className="p-4 text-xs leading-relaxed text-muted-foreground">
                            {aiLoading ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-3">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <span className="font-medium animate-pulse">Analyzing differences...</span>
                                </div>
                            ) : summary ? (
                                <div className="whitespace-pre-wrap prose prose-invert prose-sm">
                                    {summary}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 italic">
                                    <MessageSquareText className="h-3 w-3" />
                                    No summary available.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            )}
        </div>

        <div className="flex-1 flex overflow-hidden h-full">
            <div className="flex-1 relative">
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
            
            <BlameSidebar 
                isVisible={showBlame} 
                blameData={blameData} 
                onClose={() => setShowBlame(false)} 
            />
        </div>
      </div>
      {sliderProps && (
          <TimeMachineSlider 
            currentIndex={sliderProps.currentIndex}
            max={sliderProps.max}
            onChange={sliderProps.onChange}
            label={sliderProps.label}
            timestamp={sliderProps.timestamp}
          />
      )}
    </div>
  );
}
