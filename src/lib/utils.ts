import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getLanguageFromPath = (path: string | null) => {
    if (!path) return 'plaintext';
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'js':
        case 'jsx': return 'javascript';
        case 'ts':
        case 'tsx': return 'typescript';
        case 'py': return 'python';
        case 'rb': return 'ruby';
        case 'go': return 'go';
        case 'rs': return 'rust';
        case 'java': return 'java';
        case 'cpp':
        case 'cc':
        case 'c': return 'cpp';
        case 'cs': return 'csharp';
        case 'html': return 'html';
        case 'css': return 'css';
        case 'json': return 'json';
        case 'md': return 'markdown';
        case 'yml':
        case 'yaml': return 'yaml';
        case 'sh':
        case 'bash': return 'shell';
        default: return 'plaintext';
    }
};

/**
 * Slices a string by line numbers (1-based)
 * Includes optional context lines.
 */
export function sliceLines(content: string, startLine: number, endLine: number, context = 10): string {
    if (!content) return '';
    const lines = content.split('\n');
    const start = Math.max(0, startLine - 1 - context);
    const end = Math.min(lines.length, endLine + context);
    return lines.slice(start, end).join('\n');
}

export function formatRelativeTime(date: Date | number): string {
    const now = new Date().getTime();
    const then = typeof date === 'number' ? date : date.getTime();
    const diff = Math.floor((now - then) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(then).toLocaleDateString();
}
