'use client';

import { useState, useEffect } from 'react';
import { GitPullRequest, GitMerge, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getConfig, setConfig } from '@/lib/electron';
import { checkout } from '@/lib/api';
import SidebarSection from '@/components/SidebarSection';

interface PR {
    id: number;
    title: string;
    user: { login: string };
    html_url: string;
    head: { ref: string; sha: string };
    number: number;
    status?: 'pending' | 'success' | 'error' | 'failure' | null;
}

interface SidebarPRSectionProps {
    repoPath: string;
    onCheckout: (branch: string) => void;
}

export default function SidebarPRSection({ repoPath, onCheckout }: SidebarPRSectionProps) {
    const [prs, setPrs] = useState<PR[]>([]);
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState('');
    const [repoUrl, setRepoUrl] = useState('');

    useEffect(() => {
        if (repoPath) {
            loadConfig();
        }
    }, [repoPath]);

    const loadConfig = async () => {
        try {
            const config = await getConfig(repoPath);
            const lines = config.split('\n');
            // Try github.token first, then fallback to any env/storage if we had one
            const tokenLine = lines.find((l: string) => l.startsWith('github.token='));
            if (tokenLine) setToken(tokenLine.split('=')[1]);
            
            const remoteLine = lines.find((l: string) => l.startsWith('remote.origin.url='));
            if (remoteLine) setRepoUrl(remoteLine.split('=')[1]);
        } catch (e) {
            console.error(e);
        }
    };

    const getStatusIcon = (status: PR['status']) => {
        switch (status) {
            case 'success': return <span className="text-green-500" title="Passed">✅</span>;
            case 'failure':
            case 'error': return <span className="text-red-500" title="Failed">❌</span>;
            case 'pending': return <span className="text-yellow-500 animate-pulse" title="Pending">⏳</span>;
            default: return null;
        }
    };

    const fetchPRs = async () => {
        if (!repoUrl) return;
        setLoading(true);
        try {
            let cleanUrl = repoUrl.replace('.git', '');
            const parts = cleanUrl.split(/[/:]/);
            const repo = parts.pop();
            const owner = parts.pop();
            
            if (!owner || !repo) throw new Error("Could not parse repo URL");

            const headers: any = { 'Accept': 'application/vnd.github.v3+json' };
            if (token) headers['Authorization'] = `token ${token}`;

            const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, { headers });
            if (!res.ok) throw new Error("Failed to fetch PRs");
            let data = await res.json();
            
            // Fetch status for each PR head
            const prsWithStatus = await Promise.all(data.map(async (pr: PR) => {
                try {
                    const statusRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${pr.head.sha}/status`, { headers });
                    if (statusRes.ok) {
                        const statusData = await statusRes.json();
                        return { ...pr, status: statusData.state };
                    }
                } catch (e) {}
                return pr;
            }));

            setPrs(prsWithStatus);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (!repoUrl || !repoUrl.includes('github.com')) return null;

    return (
        <SidebarSection 
            title="Pull Requests" 
            defaultOpen={false}
            action={
                <Button variant="ghost" size="icon" className="h-4 w-4" onClick={(e) => { e.stopPropagation(); fetchPRs(); }} disabled={loading} title="Refresh PRs">
                    <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            }
        >
            <ScrollArea className="max-h-64">
                <div className="space-y-1">
                    {prs.length === 0 && !loading && (
                        <div className="text-xs text-muted-foreground px-2 italic">No open PRs</div>
                    )}
                    {prs.map(pr => (
                        <div key={pr.id} className="group p-2 rounded hover:bg-muted text-xs cursor-pointer">
                            <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="font-medium truncate" title={pr.title}>#{pr.number} {pr.title}</div>
                                <div className="flex-shrink-0 text-[10px]">{getStatusIcon(pr.status)}</div>
                            </div>
                            <div className="flex justify-between items-center text-muted-foreground">
                                <span>{pr.user.login}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-5 w-5"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onCheckout(pr.head.ref);
                                        }}
                                        title={`Checkout ${pr.head.ref}`}
                                    >
                                        <GitPullRequest className="h-3 w-3" />
                                    </Button>
                                    <a 
                                        href={pr.html_url} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="inline-flex items-center justify-center h-5 w-5 hover:bg-accent rounded"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </SidebarSection>
    );
}