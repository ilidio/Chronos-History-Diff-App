const API_BASE_URL = 'http://localhost:5030/api';

export async function getTextGraph(repoPath: string) {
    const response = await fetch(`${API_BASE_URL}/repository/text-graph?repoPath=${encodeURIComponent(repoPath)}`);
    if (!response.ok) throw new Error('Failed to fetch text graph');
    return response.json();
}

export async function createBranch(repoPath: string, branchName: string) {
    const response = await fetch(`${API_BASE_URL}/repository/branch/create?repoPath=${encodeURIComponent(repoPath)}&branchName=${encodeURIComponent(branchName)}`, {
        method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to create branch');
}

export async function deleteBranch(repoPath: string, branchName: string) {
    const response = await fetch(`${API_BASE_URL}/repository/branch/delete?repoPath=${encodeURIComponent(repoPath)}&branchName=${encodeURIComponent(branchName)}`, {
        method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to delete branch');
}

export async function fetchRepo(repoPath: string) {
    const response = await fetch(`${API_BASE_URL}/repository/remote/fetch?repoPath=${encodeURIComponent(repoPath)}`, {
        method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to fetch');
}

export async function pullRepo(repoPath: string) {
    const response = await fetch(`${API_BASE_URL}/repository/remote/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath, message: "Pull", authorName: "ChronosHistoryDiff", authorEmail: "chronos@history.com" })
    });
    if (!response.ok) throw new Error('Failed to pull');
}

export async function pushRepo(repoPath: string) {
    const response = await fetch(`${API_BASE_URL}/repository/remote/push?repoPath=${encodeURIComponent(repoPath)}`, {
        method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to push');
}

export async function getBranches(repoPath: string) {
  const response = await fetch(`${API_BASE_URL}/repository/branches?repoPath=${encodeURIComponent(repoPath)}`);
  if (!response.ok) throw new Error('Failed to fetch branches');
  return response.json();
}

export async function getRepoStatus(repoPath: string) {
  const response = await fetch(`${API_BASE_URL}/repository/status?repoPath=${encodeURIComponent(repoPath)}`);
  if (!response.ok) throw new Error('Failed to fetch status');
  return response.json();
}

export async function getRepoLog(repoPath: string, count = 50) {
  const response = await fetch(`${API_BASE_URL}/repository/log?repoPath=${encodeURIComponent(repoPath)}&count=${count}`);
  if (!response.ok) throw new Error('Failed to fetch log');
  return response.json();
}

export async function getFileDiff(repoPath: string, filePath: string) {
  const response = await fetch(`${API_BASE_URL}/repository/diff?repoPath=${encodeURIComponent(repoPath)}&filePath=${encodeURIComponent(filePath)}`);
  if (!response.ok) throw new Error('Failed to fetch diff');
  return response.json();
}

export async function getCommitChanges(repoPath: string, commitSha: string) {
  const response = await fetch(`${API_BASE_URL}/repository/commit-changes?repoPath=${encodeURIComponent(repoPath)}&commitSha=${encodeURIComponent(commitSha)}`);
  if (!response.ok) throw new Error('Failed to fetch commit changes');
  return response.json();
}

export async function getCommitFileDiff(repoPath: string, commitSha: string, filePath: string) {
  const response = await fetch(`${API_BASE_URL}/repository/commit-diff?repoPath=${encodeURIComponent(repoPath)}&commitSha=${encodeURIComponent(commitSha)}&filePath=${encodeURIComponent(filePath)}`);
  if (!response.ok) throw new Error('Failed to fetch commit diff');
  return response.json();
}

export async function stageFile(repoPath: string, filePath: string) {
  const response = await fetch(`${API_BASE_URL}/repository/stage?repoPath=${encodeURIComponent(repoPath)}&filePath=${encodeURIComponent(filePath)}`, {
      method: 'POST'
  });
  if (!response.ok) throw new Error('Failed to stage file');
}

export async function unstageFile(repoPath: string, filePath: string) {
  const response = await fetch(`${API_BASE_URL}/repository/unstage?repoPath=${encodeURIComponent(repoPath)}&filePath=${encodeURIComponent(filePath)}`, {
      method: 'POST'
  });
  if (!response.ok) throw new Error('Failed to unstage file');
}

export async function commitChanges(repoPath: string, message: string, authorName: string, authorEmail: string, amend = false) {
    const response = await fetch(`${API_BASE_URL}/repository/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath, message, authorName, authorEmail, amend })
    });
    if (!response.ok) throw new Error('Failed to commit');
}

export async function checkout(repoPath: string, branchOrCommit: string) {
    const response = await fetch(`${API_BASE_URL}/repository/checkout?repoPath=${encodeURIComponent(repoPath)}&branchOrCommit=${encodeURIComponent(branchOrCommit)}`, {
        method: 'POST'
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to checkout');
    }
}

export async function merge(repoPath: string, target: string) {
    // using generic commit request structure: Message -> target
    const response = await fetch(`${API_BASE_URL}/repository/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath, message: target, authorName: "ChronosHistoryDiff", authorEmail: "chronos@history.com" }) 
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to merge');
    }
}

export async function cherryPick(repoPath: string, commitSha: string) {
    // using generic commit request structure: Message -> commitSha
    const response = await fetch(`${API_BASE_URL}/repository/cherrypick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath, message: commitSha, authorName: "ChronosHistoryDiff", authorEmail: "chronos@history.com" })
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to cherry-pick');
    }
}

export async function getStashes(repoPath: string) {
    const response = await fetch(`${API_BASE_URL}/repository/stashes?repoPath=${encodeURIComponent(repoPath)}`);
    if (!response.ok) throw new Error('Failed to fetch stashes');
    return response.json();
}

export async function stashChanges(repoPath: string, message?: string) {
    const response = await fetch(`${API_BASE_URL}/repository/stash/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath, message })
    });
    if (!response.ok) throw new Error('Failed to stash changes');
}

export async function popStash(repoPath: string, index = 0) {
    const response = await fetch(`${API_BASE_URL}/repository/stash/pop?repoPath=${encodeURIComponent(repoPath)}&index=${index}`, {
        method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to pop stash');
}

export async function dropStash(repoPath: string, index = 0) {
    const response = await fetch(`${API_BASE_URL}/repository/stash/drop?repoPath=${encodeURIComponent(repoPath)}&index=${index}`, {
        method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to drop stash');
}

export async function undoLastCommit(repoPath: string) {
    const response = await fetch(`${API_BASE_URL}/repository/commit/undo?repoPath=${encodeURIComponent(repoPath)}`, {
        method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to undo last commit');
}

export async function getRebaseStatus(repoPath: string) {
    const response = await fetch(`${API_BASE_URL}/repository/rebase/status?repoPath=${encodeURIComponent(repoPath)}`);
    if (!response.ok) throw new Error('Failed to get rebase status');
    return response.json();
}

export async function startInteractiveRebase(repoPath: string, base: string) {
    const response = await fetch(`${API_BASE_URL}/repository/rebase/start?repoPath=${encodeURIComponent(repoPath)}&base=${encodeURIComponent(base)}`, {
        method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to start rebase');
    return response.json();
}

export async function continueRebase(repoPath: string, instructions: any[]) {
    const response = await fetch(`${API_BASE_URL}/repository/rebase/continue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath, instructions })
    });
    if (!response.ok) throw new Error('Failed to continue rebase');
}

export async function abortRebase(repoPath: string) {
    const response = await fetch(`${API_BASE_URL}/repository/rebase/abort?repoPath=${encodeURIComponent(repoPath)}`, {
        method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to abort rebase');
}
