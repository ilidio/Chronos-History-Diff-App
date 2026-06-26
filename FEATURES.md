# Chronos Suite — Feature Overview

Chronos is one product delivered as three tools that share a single on-disk
history store (`.chronos-history`):

| Tool | Role | Stack |
| :--- | :--- | :--- |
| **Chronos History for VS Code** | Editor extension — *captures* history | TypeScript |
| **Chronos History for Visual Studio** | Editor extension — *captures* history | C# / .NET Framework 4.7.2 |
| **ChronosHistoryDiff (Desktop App)** | Full-screen *viewer & comparer* | Electron + Next.js |

The two editor extensions are the **writers** (they snapshot your files as you
work); the desktop app is the rich **reader/comparer**. All three read and write
the same format, so history captured in one shows up in the others.

---

## Feature matrix

| Feature | VS Code ext | VS ext | Diff App |
| :--- | :---: | :---: | :---: |
| Captures snapshots on save | ✅ | ✅ | ❌ (read-only consumer) |
| Reads `.chronos-history` | ✅ | ✅ | ✅ |
| Git history / blame / diff viewing | ✅ | ✅ | ✅ (richer) |
| File explorer + heatmap + indexed/semantic search | partial | partial | ✅ (most complete) |
| AI merge-conflict resolver · milestones · shareable HTML | ❌ | ❌ | ✅ (unique) |

---

## 1. Captures snapshots on save

Automatically saves a point-in-time copy of a file every time you save it,
independent of Git — the local "time machine" safety net.

- **VS Code ✅** — Listens on document save → writes a snapshot, with an initial
  baseline on open, plus rename and delete tracking. Records line magnitude
  (+/−) and an optional AI summary label. Skips saves with identical content.
- **VS extension ✅** — Hooks the running-document-table `OnAfterSave` event
  (fires on Ctrl+S) and writes a snapshot, with the same identical-content
  de-duplication.
- **Diff App ❌** — By design a **read-only consumer**. It never captures
  snapshots; it only reads what the editors write. This is the core
  architectural split of the suite.

## 2. Reads `.chronos-history`

Understands the shared on-disk store: per-project `{name}-{hash}/index.json`
folders, content blobs, and the global `workspaces.json` registry.

- **VS Code ✅** — Owns the format; reads global + per-project indices, custom
  storage paths, and in-project `.history/` mode.
- **VS extension ✅** — Writes the shared `%LOCALAPPDATA%\.chronos-history`
  layout (matching project-hash, relative paths, and registry) so the desktop
  app can read Visual Studio history.
- **Diff App ✅** — Discovers and parses the store, including in-project
  `.history/`, global shared storage, and custom paths.

## 3. Git history / blame / diff viewing

Viewing real Git commit history, line-level blame, and side-by-side diffs.

- **VS Code ✅** — Git CLI: file history, `git log -L` selection history,
  blame-driven heatmap, and branch comparison.
- **VS extension ✅** — Uniquely uses **LibGit2Sharp (native) with a Git-CLI
  fallback** for reliability on Windows: commit history, selection history,
  compare-with-branch, and a blame heatmap.
- **Diff App ✅ (richest)** — `git log -p --follow` with patches, a porcelain
  **blame parser**, `-L` selection history, `-S`/`-G` content search, branch
  listing/filtering, and merge-conflict stage extraction — all rendered as
  **editable Monaco diffs**.

## 4. File explorer + heatmap + indexed/semantic search

A navigable file tree, "churn" heat indicators, and fast keyword + AI-intent
search across the working tree *and* history.

- **VS Code (partial)** — Has the heatmap, AI semantic search, and deep content
  search — but no built-in file-tree explorer (it relies on the editor's own).
- **VS extension (partial)** — Has the heatmap and a history graph, but no
  semantic search and no file explorer.
- **Diff App ✅ (most complete)** — Full file tree/explorer, heat indicators in
  the explorer, an indexed keyword search over files + snapshots, AI semantic
  search, and history grep.

## 5. AI merge-conflict resolver · milestones · shareable HTML

Three desktop-only power features.

- **VS Code ❌** — None of these three. It does have a different AI set: daily
  briefing, changelog generator, AI commit messages, "explain changes," local
  experiments, and `.chronos` snapshot sharing.
- **VS extension ❌** — None; its only AI feature is commit-message generation.
- **Diff App ✅ (unique)** — Gemini-powered 3-way merge-conflict resolution,
  named milestones (grouping related snapshots), and exporting a comparison as a
  standalone interactive HTML report.

---

## At a glance

- **The editors capture; the app consumes** — which is why "captures on save" is
  the one row the desktop app intentionally lacks.
- **The Diff App is the most feature-rich viewer** (rows 3–5), matching its role
  as the full-screen analysis hub.
- **The VS extension is the thinnest** of the three — it covers the core
  (capture, git, heatmap, AI commit) but lacks semantic search, experiments,
  briefings, the changelog generator, and the desktop-only trio.
