'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, ExternalLink, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getConfig } from '@/lib/electron';
import SidebarSection from '@/components/SidebarSection';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Issue {
    id: number;
    title: string;
    user: { login: string };
    html_url: string;
    number: number;
    state: string;
}

interface SidebarIssuesSectionProps {
    repoPath: string;
}

export default function SidebarIssuesSection({ repoPath }: SidebarIssuesSectionProps) {
    const [issues, setIssues] = useState<Issue[]>([]);
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
            const tokenLine = lines.find((l: string) => l.startsWith('github.token='));
            if (tokenLine) setToken(tokenLine.split('=')[1]);
            
            const remoteLine = lines.find((l: string) => l.startsWith('remote.origin.url='));
            if (remoteLine) setRepoUrl(remoteLine.split('=')[1]);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchIssues = async () => {
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

            const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&sort=updated`, { headers });
            if (!res.ok) throw new Error("Failed to fetch Issues");
            const data = await res.json();
            // Filter out PRs (GitHub API returns PRs as issues too)
            setIssues(data.filter((i: any) => !i.pull_request));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (!repoUrl.includes('github.com')) return null;

    return (
        <SidebarSection 
            title="Issues" 
            defaultOpen={false}
            action={
                <Button variant="ghost" size="icon" className="h-4 w-4" onClick={(e) => { e.stopPropagation(); fetchIssues(); }} disabled={loading} title="Refresh Issues">
                    <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            }
        >
            <ScrollArea className="max-h-64">
                <div className="space-y-1">
                    {issues.length === 0 && !loading && (
                        <div className="text-xs text-muted-foreground px-2 italic">No open issues</div>
                    )}
                    {issues.map(issue => (
                        <div key={issue.id} className="group p-2 rounded hover:bg-muted text-xs cursor-default">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate mb-1" title={issue.title}>#{issue.number} {issue.title}</div>
                                    <div className="flex justify-between items-center text-muted-foreground">
                                        <span>{issue.user.login}</span>
                                        <a 
                                            href={issue.html_url} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center h-5 w-5 hover:bg-accent rounded"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </SidebarSection>
    );
}