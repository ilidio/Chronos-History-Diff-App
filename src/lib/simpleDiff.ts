// Simple implementation of Myers Diff Algorithm for line-by-line comparison

export type DiffChange = {
    type: 'keep' | 'insert' | 'delete';
    content: string;
    originalLine?: number;
    modifiedLine?: number;
};

export function computeDiff(original: string, modified: string): DiffChange[] {
    const oldLines = original.split(/\r?\n/);
    const newLines = modified.split(/\r?\n/);
    
    // Simple LCS-based diff or just a simple Myers implementation.
    // For brevity and robustness in this context, let's use a simplified greedy approach 
    // or a standard Myers if strictly needed.
    // Let's go with a basic trace-back LCS which is easier to implement "from scratch" 
    // correctly than optimizing Myers for space without a library.
    
    const N = oldLines.length;
    const M = newLines.length;
    
    // DP Matrix: LCS[i][j] = length of LCS of oldLines[0..i-1] and newLines[0..j-1]
    // Note: This O(N*M) is slow for huge files. 
    // If files are large (>1000 lines), this might lag. 
    // But for a "simple internal tool", it's a start.
    
    const lcs = Array(N + 1).fill(0).map(() => Array(M + 1).fill(0));
    
    for (let i = 1; i <= N; i++) {
        for (let j = 1; j <= M; j++) {
            if (oldLines[i - 1] === newLines[j - 1]) {
                lcs[i][j] = lcs[i - 1][j - 1] + 1;
            } else {
                lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
            }
        }
    }
    
    // Backtrack to find diff
    const changes: DiffChange[] = [];
    let i = N;
    let j = M;
    
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
            changes.unshift({ type: 'keep', content: oldLines[i - 1], originalLine: i, modifiedLine: j });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
            changes.unshift({ type: 'insert', content: newLines[j - 1], modifiedLine: j });
            j--;
        } else if (i > 0 && (j === 0 || lcs[i][j - 1] < lcs[i - 1][j])) {
            changes.unshift({ type: 'delete', content: oldLines[i - 1], originalLine: i });
            i--;
        }
    }
    
    return changes;
}

export function alignDiffChanges(changes: DiffChange[]) {
    // Group changes for side-by-side rendering
    // We want to align Deletes and Inserts if they are adjacent (Modification)
    const rows = [];
    let i = 0;
    while(i < changes.length) {
        const change = changes[i];
        if (change.type === 'keep') {
            rows.push({ left: change, right: change });
            i++;
        } else if (change.type === 'delete') {
            // Check if followed by insert
            let j = i + 1;
            const deletes = [change];
            while(j < changes.length && changes[j].type === 'delete') {
                deletes.push(changes[j]);
                j++;
            }
            
            const inserts = [];
            while(j < changes.length && changes[j].type === 'insert') {
                inserts.push(changes[j]);
                j++;
            }
            
            // Match up deletes and inserts
            const max = Math.max(deletes.length, inserts.length);
            for(let k=0; k<max; k++) {
                rows.push({
                    left: deletes[k] || null,
                    right: inserts[k] || null
                });
            }
            i = j;
        } else if (change.type === 'insert') {
             // Just inserts (no preceding deletes handled above)
             rows.push({ left: null, right: change });
             i++;
        }
    }
    return rows;
}
