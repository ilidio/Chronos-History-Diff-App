const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const { spawn, exec, execFile } = require('child_process');
const fs = require('fs');
const glob = require('glob');
const minimatch = require('minimatch');

// Fix for PATH in packaged apps on macOS/Linux
if (process.platform !== 'win32') {
    const commonPaths = ['/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin', '/opt/homebrew/bin'];
    const currentPath = process.env.PATH || '';
    const newPath = Array.from(new Set([...currentPath.split(':'), ...commonPaths])).join(':');
    process.env.PATH = newPath;
}

app.commandLine.appendSwitch('ignore-certificate-errors');

let loadURL;

(async () => {
    try {
        const serve = (await import('electron-serve')).default;
        loadURL = serve({ directory: 'out' });
    } catch (e) {
        console.error("Failed to load electron-serve", e);
    }
})();

app.setName('ChronosHistoryDiff');

let mainWindow = null;

function createMenu(recentPaths = [], recentFiles = []) {
    const isMac = process.platform === 'darwin';
    
    const recentPathsSubmenu = recentPaths.length > 0 
        ? recentPaths.map(p => ({
            label: p,
            click: () => {
                mainWindow?.webContents.send('menu:open-folder', p);
            }
        }))
        : [{ label: 'No Recent Folders', enabled: false }];

    const recentFilesSubmenu = recentFiles.length > 0
        ? recentFiles.map(f => {
            const filePath = typeof f === 'string' ? f : f.filePath;
            const repoPath = typeof f === 'string' ? '' : f.repoPath;
            return {
                label: path.basename(filePath),
                sublabel: filePath,
                toolTip: `${filePath}\nProject: ${repoPath || 'None'}`,
                click: () => {
                    mainWindow?.webContents.send('menu:open-file', { filePath, repoPath });
                }
            };
        })
        : [{ label: 'No Recent Files', enabled: false }];

    const template = [
        ...(isMac ? [{
            label: 'ChronosHistoryDiff',
            submenu: [
                { 
                    label: 'About ChronosHistoryDiff', // Custom label
                    click: () => {
                        mainWindow?.webContents.send('menu:open-about');
                    }
                },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        }] : []),
        {
            label: 'File',
            submenu: [
                { 
                    label: 'Open Folder...', 
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, { 
                            properties: ['openDirectory'],
                            title: 'Open Repository Folder'
                        });
                        if (!canceled && filePaths.length > 0) {
                            console.log("Sending menu:open-folder event with path:", filePaths[0]);
                            mainWindow?.webContents.send('menu:open-folder', filePaths[0]);
                            addToRecentPaths(filePaths[0]);
                        }
                    }
                },
                {
                    label: 'Open Recent Folder',
                    submenu: recentPathsSubmenu
                },
                {
                    label: 'Open Recent File',
                    submenu: recentFilesSubmenu
                },
                { type: 'separator' },
                isMac ? { role: 'close' } : { role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { type: 'separator' },
                {
                    label: 'Settings...',
                    accelerator: 'CmdOrCtrl+,',
                    click: () => {
                        mainWindow?.webContents.send('menu:open-settings');
                    }
                },
                { type: 'separator' },
                { role: 'delete' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                ...(isMac ? [
                    { type: 'separator' },
                    { role: 'front' },
                    { type: 'separator' },
                    { role: 'window' }
                ] : [
                    { role: 'close' }
                ])
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Show Help',
                    accelerator: 'Shift+?',
                    click: () => {
                        mainWindow?.webContents.send('menu:open-help');
                    }
                },
                ...(!isMac ? [
                    {
                        label: 'About ChronosHistoryDiff',
                        click: () => {
                            mainWindow?.webContents.send('menu:open-about');
                        }
                    }
                ] : []),
                { type: 'separator' },
                {
                    label: 'Learn More',
                    click: async () => {
                        await shell.openExternal('https://github.com/ilidio/Chronos-History-Diff-App');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Runs git with an explicit argument array via execFile (no shell), so repo- and
// user-controlled values (refs, paths, search patterns, branch names) can never be
// interpreted as shell syntax. Always pass `args` as an array of strings.
function runGit(args, repoPath, options = { trim: true }) {
  const normalizedPath = path.normalize(repoPath);
  if (!Array.isArray(args)) {
      return Promise.reject(new Error('runGit: args must be an array of strings'));
  }
  console.log(`[runGit] git ${args.join(' ')} in ${normalizedPath}`);

  return new Promise((resolve, reject) => {
      execFile('git', args, {
          cwd: normalizedPath,
          maxBuffer: 1024 * 1024 * 10,
          windowsHide: true
      }, (error, stdout, stderr) => {
          if (error) {
              console.error(`[runGit] Error: ${error.message}`);
              if (stderr) console.error(`[runGit] Stderr: ${stderr}`);
              // Preserve stdout/stderr on the error so callers (e.g. `diff --no-index`,
              // which exits non-zero when differences are found) can still read output.
              const wrapped = new Error(stderr ? stderr.trim() : error.message);
              wrapped.stdout = stdout;
              wrapped.stderr = stderr;
              reject(wrapped);
          } else {
              const output = options.trim ? stdout.trim() : stdout;
              resolve(output);
          }
      });
  });
}

function getAppSettingsPath() {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'chronos-app-settings.json');
}

async function readAppSettings() {
    const settingsPath = getAppSettingsPath();
    try {
        if (fs.existsSync(settingsPath)) {
            const data = await fs.promises.readFile(settingsPath, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error("Failed to read app settings:", e);
    }
    return {}; // Return empty object if file not found or parsing fails
}

async function writeAppSettings(settings) {
    const settingsPath = getAppSettingsPath();
    try {
        await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    } catch (e) {
        console.error("Failed to write app settings:", e);
        throw e;
    }
}

async function addToRecentPaths(newPath) {
    const settings = await readAppSettings();
    let recentPaths = settings.recentPaths || [];
    let recentFiles = settings.recentFiles || [];
    
    // Remove if exists, add to front, limit to 10
    recentPaths = [newPath, ...recentPaths.filter(p => p !== newPath)].slice(0, 10);
    
    settings.recentPaths = recentPaths;
    await writeAppSettings(settings);
    createMenu(recentPaths, recentFiles);
}

async function addToRecentFiles(newFilePath, repoPath) {
    const settings = await readAppSettings();
    let recentPaths = settings.recentPaths || [];
    let recentFiles = settings.recentFiles || [];
    
    const entry = { filePath: newFilePath, repoPath: repoPath };
    
    // Remove if exists (by filePath), add to front, limit to 10
    recentFiles = [entry, ...recentFiles.filter(f => (typeof f === 'string' ? f : f.filePath) !== newFilePath)].slice(0, 10);
    
    settings.recentFiles = recentFiles;
    await writeAppSettings(settings);
    createMenu(recentPaths, recentFiles);
}

async function createWindow() {
  const isMac = process.platform === 'darwin';
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'public', 'chronos_logo.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: isMac ? 'hiddenInset' : undefined,
    frame: true,
  });

  const settings = await readAppSettings();
  createMenu(settings.recentPaths || [], settings.recentFiles || []);

  if (process.platform === 'darwin') {
      try {
        app.dock.setIcon(path.join(__dirname, 'public', 'chronos_logo.png'));
      } catch (e) { console.error("Failed to set dock icon", e); }
  }

  if (app.isPackaged) {
      await loadURL(mainWindow);
  } else {
      await mainWindow.loadURL('https://localhost:3000');
      mainWindow.webContents.openDevTools();
  }
}

async function getChronosSetting(repoPath, settingName, defaultValue) {
    // 1. Check workspace settings
    const wsSettingsPath = path.join(repoPath, '.vscode', 'settings.json');
    if (fs.existsSync(wsSettingsPath)) {
        try {
            const content = fs.readFileSync(wsSettingsPath, 'utf8');
            const json = JSON.parse(content);
            if (json[`chronos.${settingName}`] !== undefined) {
                return json[`chronos.${settingName}`];
            }
        } catch (e) {}
    }

    // 2. Check global settings
    const isMac = process.platform === 'darwin';
    const globalSettingsPath = isMac
        ? path.join(app.getPath('home'), 'Library/Application Support/Code/User/settings.json')
        : path.join(app.getPath('appData'), 'Code/User/settings.json');

    if (fs.existsSync(globalSettingsPath)) {
        try {
            const content = fs.readFileSync(globalSettingsPath, 'utf8');
            const json = JSON.parse(content);
            if (json[`chronos.${settingName}`] !== undefined) {
                return json[`chronos.${settingName}`];
            }
        } catch (e) {}
    }

    return defaultValue;
}

function generateProjectHash(p) {
    // Simple fast string hashing for folder names (matches VS Code extension)
    let hash = 0;
    for (let i = 0; i < p.length; i++) {
        const char = p.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 8);
}

function getGlobalHistoryRoot() {
    const isWin = process.platform === 'win32';
    if (isWin) {
        // C:\Users\#USER_NAME#\AppData\Local\.chronos-history
        return path.join(process.env.LOCALAPPDATA || path.join(app.getPath('home'), 'AppData', 'Local'), '.chronos-history');
    }
    // ~/.chronos-history
    return path.join(app.getPath('home'), '.chronos-history');
}

async function findChronosHistoryDir(repoPath) {
    console.log(`[Storage] Searching history for: ${repoPath}`);
    
    // 1. Check if saveInProjectFolder is enabled or if .history exists locally
    const saveInProject = await getChronosSetting(repoPath, 'saveInProjectFolder', false);
    console.log(`[Storage] chronos.saveInProjectFolder is: ${saveInProject}`);

    const localHistory = path.join(repoPath, '.history');
    if (fs.existsSync(localHistory) && fs.existsSync(path.join(localHistory, 'index.json'))) {
        console.log(`[Storage] Found local history at: ${localHistory}`);
        return localHistory;
    }

    // 2. Check Global Shared Storage (~/.chronos-history or AppData/Local/.chronos-history)
    const globalRoot = getGlobalHistoryRoot();
    const projectHash = generateProjectHash(repoPath);
    const projectName = path.basename(repoPath);
    const sharedHistoryPath = path.join(globalRoot, `${projectName}-${projectHash}`);

    if (fs.existsSync(sharedHistoryPath) && fs.existsSync(path.join(sharedHistoryPath, 'index.json'))) {
        console.log(`[Storage] Found shared history at: ${sharedHistoryPath}`);
        return sharedHistoryPath;
    }

    // 2b. Consult the workspaces.json registry written by the editor extensions.
    // This makes discovery robust when the project folder name/hash was derived from
    // a different root path string (e.g. the Visual Studio extension), since the
    // registry records each project's actual rootPath -> {name, id} mapping.
    try {
        const registryPath = path.join(globalRoot, 'workspaces.json');
        if (fs.existsSync(registryPath)) {
            const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
            const normalizedRepo = path.normalize(repoPath).toLowerCase();
            const match = (registry.workspaces || []).find(w =>
                w && w.rootPath && path.normalize(w.rootPath).toLowerCase() === normalizedRepo);
            if (match) {
                const registeredPath = path.join(globalRoot, `${match.name}-${match.id}`);
                if (fs.existsSync(path.join(registeredPath, 'index.json'))) {
                    console.log(`[Storage] Found history via registry at: ${registeredPath}`);
                    return registeredPath;
                }
            }
        }
    } catch (e) {
        console.error('[Storage] Failed to read workspaces.json registry:', e.message);
    }

    // 3. Try custom storage path from settings
    const customPath = await getChronosSetting(repoPath, 'customStoragePath', '');
    if (customPath) {
        let resolvedPath = customPath;
        if (customPath.startsWith('~')) {
            resolvedPath = path.join(app.getPath('home'), customPath.slice(1));
        }
        const customHistoryPath = path.isAbsolute(resolvedPath) ? resolvedPath : path.join(repoPath, resolvedPath);
        // If it's a global custom path, we should also check for the project-specific subfolder
        const projectSpecificCustom = path.join(customHistoryPath, `${projectName}-${projectHash}`);
        
        if (fs.existsSync(projectSpecificCustom) && fs.existsSync(path.join(projectSpecificCustom, 'index.json'))) {
            return projectSpecificCustom;
        }
        if (fs.existsSync(customHistoryPath) && fs.existsSync(path.join(customHistoryPath, 'index.json'))) {
            return customHistoryPath;
        }
    }

    // 4. Try VS Code workspaceStorage (Legacy fallback)
    const isMac = process.platform === 'darwin';
    const appData = isMac 
        ? path.join(app.getPath('home'), 'Library/Application Support/Code/User/workspaceStorage')
        : path.join(app.getPath('appData'), 'Code/User/workspaceStorage');

    console.log(`[Storage] Checking VS Code storage at: ${appData}`);

    if (fs.existsSync(appData)) {
        try {
            const dirs = fs.readdirSync(appData);
            for (const dir of dirs) {
                const wsPath = path.join(appData, dir);
                const wsJsonPath = path.join(wsPath, 'workspace.json');
                if (fs.existsSync(wsJsonPath)) {
                    try {
                        const wsData = JSON.parse(fs.readFileSync(wsJsonPath, 'utf8'));
                        const folderUri = wsData.folder || (wsData.folders && wsData.folders[0]?.uri);
                        if (folderUri) {
                            let decodedUri = decodeURIComponent(folderUri).replace('file://', '');
                            if (process.platform === 'win32' && decodedUri.startsWith('/')) {
                                decodedUri = decodedUri.substring(1);
                            }
                            
                            const normalizedDecoded = path.normalize(decodedUri).toLowerCase();
                            const normalizedRepo = path.normalize(repoPath).toLowerCase();

                            if (normalizedDecoded === normalizedRepo) {
                                const chronosPath = path.join(wsPath, 'IldioMartins.chronos-history');
                                if (fs.existsSync(chronosPath)) {
                                    console.log(`[Storage] Match found! Workspace: ${dir}, Chronos path: ${chronosPath}`);
                                    return chronosPath;
                                }
                            }
                        }
                    } catch (e) {}
                }
            }
        } catch (e) {
            console.error("[Storage] Error searching workspaceStorage:", e);
        }
    }

    console.log(`[Storage] No history folder found for ${repoPath}`);
    return null;
}



app.whenReady().then(async () => {
  const settings = await readAppSettings();
  createMenu(settings.recentPaths || []);

  ipcMain.handle('app:addToRecent', async (_, path) => {
    await addToRecentPaths(path);
  });

  ipcMain.handle('app:addToRecentFile', async (_, { filePath, repoPath }) => {
    await addToRecentFiles(filePath, repoPath);
  });

  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });
  ipcMain.handle('git:clone', async (_, { url, destination }) => {
      return new Promise((resolve, reject) => {
          const child = spawn('git', ['clone', url, destination]);
          child.on('close', (code) => {
              if (code === 0) resolve();
              else reject(new Error(`Git clone failed with code ${code}`));
          });
      });
  });

  ipcMain.handle('git:externalDiff', async (_, { original, modified, tool }) => {
      const tmpDir = app.getPath('temp');
      const fileA = path.join(tmpDir, `chronos_ext_a_${Date.now()}.txt`);
      const fileB = path.join(tmpDir, `chronos_ext_b_${Date.now()}.txt`);

      try {
          fs.writeFileSync(fileA, original);
          fs.writeFileSync(fileB, modified);

          let command = '';
          // Simple mapping for common tools
          switch (tool) {
              case 'vscode':
                  command = `code --diff "${fileA}" "${fileB}"`;
                  break;
              case 'kdiff3':
                  command = `kdiff3 "${fileA}" "${fileB}"`;
                  break;
              case 'meld':
                  command = `meld "${fileA}" "${fileB}"`;
                  break;
              case 'bc3':
              case 'bc4':
                  command = `bcomp "${fileA}" "${fileB}"`;
                  break;
              default:
                  // Fallback to system default or just open the files?
                  // Better: if no tool, try 'git difftool' if possible, or just fail.
                  if (process.platform === 'darwin') command = `open -a "Beyond Compare" "${fileA}" "${fileB}"`;
                  else if (process.platform === 'win32') command = `start "" "Beyond Compare" "${fileA}" "${fileB}"`;
                  break;
          }

          if (command) {
              exec(command, (err) => {
                  if (err) console.error("External diff tool error:", err);
              });
          }
          return { success: true };
      } catch (e) {
          console.error("Failed to prepare external diff:", e);
          throw e;
      }
      // Note: we don't unlink files immediately because the tool needs them
  });

  ipcMain.handle('git:blame', async (_, { repoPath, filePath }) => {
      return await runGit(['blame', '--porcelain', '--', filePath], repoPath, { trim: false });
  });

  ipcMain.handle('git:fileHistory', async (_, { repoPath, filePath }) => {
      // Robust git log -p --follow to catch renames and include patches
      return await runGit(['log', '-p', '--follow', '--pretty=format:COMMIT|%H|%an|%ad|%s', '--date=iso', '--', filePath], repoPath, { trim: false });
  });

  ipcMain.handle('git:log', async (_, { repoPath, count, filePath }) => {
      const args = ['log', '-n', String(count || 50), '-p', '--pretty=format:COMMIT|%H|%an|%ad|%s', '--date=iso'];
      if (filePath) {
          args.push('--follow', '--', filePath);
      }
      return await runGit(args, repoPath, { trim: false });
  });

  ipcMain.handle('git:show', async (_, { repoPath, ref, filePath }) => {
      return await runGit(['show', `${ref}:${filePath}`], repoPath, { trim: false });
  });

  ipcMain.handle('git:status', async (_, repoPath) => {
      return await runGit(['status', '--porcelain'], repoPath);
  });

  ipcMain.handle('git:branches', async (_, data) => {
      const repoPath = typeof data === 'string' ? data : data.repoPath;
      const filePath = typeof data === 'object' ? data.filePath : null;

      const output = await runGit(['for-each-ref', '--format=%(objectname)|%(refname)|%(HEAD)', 'refs/heads/', 'refs/remotes/'], repoPath);

      if (!filePath) return output;

      // Filter branches that have changes in filePath compared to HEAD
      const lines = output.split('\n').filter(l => l);
      const results = await Promise.all(lines.map(async line => {
          const [commitId, refName, head] = line.split('|');
          if (head === '*') return line;
          try {
              const diff = await runGit(['log', '-n', '1', `HEAD...${refName}`, '--', filePath], repoPath);
              return diff ? line : null;
          } catch (e) { return null; }
      }));
      return results.filter(Boolean).join('\n');
  });

  ipcMain.handle('git:config', async (_, repoPath) => {
      return await runGit(['config', '--list'], repoPath);
  });

  ipcMain.handle('git:setConfig', async (_, { repoPath, key, value }) => {
      return await runGit(['config', key, value], repoPath);
  });

  ipcMain.handle('git:lsFiles', async (_, repoPath) => {
      return await runGit(['ls-files'], repoPath);
  });

  ipcMain.handle('git:commitsForDate', async (_, { repoPath, since, until }) => {
      // Get detailed commits for AI analysis
      // Format: hash|author|date|message
      // We also want to know which files were changed
      const output = await runGit(['log', `--since=${since}`, `--until=${until}`, '--pretty=format:%H|%an|%ad|%s', '--name-only'], repoPath);
      
      const commits = [];
      const blocks = output.split('\n\n'); // Each commit is separated by a blank line when using --name-only? 
      // Actually git log output needs careful parsing for --name-only
      
      const lines = output.split('\n');
      let currentCommit = null;

      for (const line of lines) {
          if (line.includes('|')) {
              const [hash, author, date, message] = line.split('|');
              currentCommit = { hash, author, date, message, files: [] };
              commits.push(currentCommit);
          } else if (line.trim() && currentCommit) {
              currentCommit.files.push(line.trim());
          }
      }
      return commits;
  });

  ipcMain.handle('chronos:createMilestone', async (_, { repoPath, name, description, files }) => {
      try {
          const historyDir = await findChronosHistoryDir(repoPath);
          if (!historyDir) throw new Error("Chronos history folder not found");
          
          const milestonesFile = path.join(historyDir, 'milestones.json');
          const milestoneId = `milestone_${Date.now()}`;
          const milestoneDir = path.join(historyDir, 'milestones', milestoneId);
          
          if (!fs.existsSync(path.join(historyDir, 'milestones'))) {
              fs.mkdirSync(path.join(historyDir, 'milestones'));
          }
          fs.mkdirSync(milestoneDir);

          const savedFiles = [];
          for (const file of files) {
              const relPath = path.isAbsolute(file) ? path.relative(repoPath, file) : file;
              const fullPath = path.isAbsolute(file) ? file : path.join(repoPath, file);
              
              if (fs.existsSync(fullPath)) {
                  // Create subdirs in milestoneDir if needed
                  const destPath = path.join(milestoneDir, relPath);
                  const destDir = path.dirname(destPath);
                  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
                  
                  fs.copyFileSync(fullPath, destPath);
                  savedFiles.push({ originalPath: relPath, milestonePath: relPath });
              }
          }

          const milestone = {
              id: milestoneId,
              name,
              description,
              timestamp: Date.now(),
              files: savedFiles
          };

          let milestones = [];
          if (fs.existsSync(milestonesFile)) {
              milestones = JSON.parse(fs.readFileSync(milestonesFile, 'utf8'));
          }
          milestones.push(milestone);
          fs.writeFileSync(milestonesFile, JSON.stringify(milestones, null, 2));

          return milestone;
      } catch (e) {
          console.error("Failed to create milestone:", e);
          throw e;
      }
  });

  ipcMain.handle('chronos:getMilestones', async (_, repoPath) => {
      try {
          const historyDir = await findChronosHistoryDir(repoPath);
          if (!historyDir) return [];
          const milestonesFile = path.join(historyDir, 'milestones.json');
          if (!fs.existsSync(milestonesFile)) return [];
          return JSON.parse(fs.readFileSync(milestonesFile, 'utf8'));
      } catch (e) {
          console.error("Failed to get milestones:", e);
          return [];
      }
  });

  ipcMain.handle('git:getConflictVersions', async (_, { repoPath, filePath }) => {
      try {
          const normalizedPath = filePath.replace(/\\/g, '/');
          
          // Stage 1: Base, Stage 2: Ours, Stage 3: Theirs
          const [base, ours, theirs] = await Promise.all([
              runGit(['show', `:1:${normalizedPath}`], repoPath, { trim: false }).catch(() => ''),
              runGit(['show', `:2:${normalizedPath}`], repoPath, { trim: false }).catch(() => ''),
              runGit(['show', `:3:${normalizedPath}`], repoPath, { trim: false }).catch(() => '')
          ]);

          return { base, ours, theirs };
      } catch (e) {
          console.error("Failed to get conflict versions:", e);
          throw e;
      }
  });

  ipcMain.handle('ai:semanticSearch', async (_, { query, history, apiKey, model, context, language }) => {
      try {
          const prompt = `You are an expert repository search assistant. 
Find the most relevant entries from the provided history list that match the user's intent query.
User Query: "${query}"
${context ? `Additional Context: ${context}` : ''}
Response language: ${language || 'English'}.

History List:
${history.map((h, i) => `${i}. ID: ${h.id} | Message: ${h.message} | Author: ${h.author} | Date: ${h.date || h.timestamp}`).join('\n')}

Instructions:
1. Identify up to 10 most relevant entries.
2. Return ONLY a JSON array of the IDs (hashes) of these entries, in order of relevance.
3. If none are relevant, return an empty array [].
Example: ["hash1", "hash2"]

Output (JSON ONLY):`;

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }]
              })
          });

          const data = await response.json();
          if (data.error) throw new Error(data.error.message);
          
          const text = data.candidates[0].content.parts[0].text;
          const jsonMatch = text.match(/\[.*\]/s);
          if (jsonMatch) {
              return JSON.parse(jsonMatch[0]);
          }
          return [];
      } catch (e) {
          console.error("Gemini AI Semantic Search Error:", e);
          throw e;
      }
  });

  ipcMain.handle('ai:resolveConflict', async (_, { base, ours, theirs, apiKey, model, language }) => {
      try {
          const prompt = `You are an expert senior software engineer. 
Your task is to resolve a 3-way merge conflict.
Base: (The common ancestor)
Ours: (Current local changes)
Theirs: (Incoming remote changes)

Please analyze the changes from both sides and provide a single, unified, merged version of the file that correctly preserves the logic from both "Ours" and "Theirs" where possible, or picks the most sensible version if they conflict directly.
Do NOT include any conflict markers like <<<<<<<, =======, or >>>>>>> in your final output.
Return ONLY the merged file content, no explanations or markdown blocks.

Language: ${language || 'English'}

BASE CONTENT:
${base.substring(0, 5000)}

OURS CONTENT:
${ours.substring(0, 5000)}

THEIRS CONTENT:
${theirs.substring(0, 5000)}

MERGED CONTENT:`;

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }]
              })
          });

          const data = await response.json();
          if (data.error) throw new Error(data.error.message);
          return data.candidates[0].content.parts[0].text;
      } catch (e) {
          console.error("Gemini AI Conflict Resolution Error:", e);
          throw e;
      }
  });

  ipcMain.handle('ai:summarizeDiff', async (_, { original, modified, apiKey, model, context, language }) => {
      try {
          const prompt = `You are an expert senior software engineer. 
Analyze the following code changes (original vs modified) and provide a concise, technical summary of what was changed and why it might have been changed.
Focus on logic changes, bug fixes, and refactoring. Ignore minor formatting if possible.
${context ? `Additional Context: ${context}` : ''}
Response language: ${language || 'English'}.

Original Code:
${original.substring(0, 5000)}

Modified Code:
${modified.substring(0, 5000)}

Summary:`;

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }]
              })
          });

          const data = await response.json();
          if (data.error) throw new Error(data.error.message);
          return data.candidates[0].content.parts[0].text;
      } catch (e) {
          console.error("Gemini AI Diff Error:", e);
          throw e;
      }
  });

  ipcMain.handle('git:dailyBrief', async (_, { commits, apiKey, model, language }) => {
      try {
          const prompt = `You are a professional software engineering lead. 
Analyze the following git commits from a developer's single day of work and provide a concise, high-level summary of progress.
Group changes by feature or category. Use bullet points. 
Response language: ${language || 'English'}.

Commits:
${commits.map(c => `- ${c.message} (${c.files.join(', ')})`).join('\n')}

Summary:`;

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }]
              })
          });

          const data = await response.json();
          if (data.error) throw new Error(data.error.message);
          return data.candidates[0].content.parts[0].text;
      } catch (e) {
          console.error("Gemini AI Error:", e);
          throw e;
      }
  });

  ipcMain.handle('git:selectionHistory', async (_, { repoPath, filePath, startLine, endLine }) => {
      // git log -L <start>,<end>:<file>
      return await runGit(['log', '-L', `${startLine},${endLine}:${filePath}`, '--pretty=format:%H|%an|%ad|%s', '--date=iso'], repoPath);
  });

  ipcMain.handle('git:searchHistory', async (_, { repoPath, filePath, searchText }) => {
      // git log -S "text" <file>
      return await runGit(['log', `-S${searchText}`, '--pretty=format:%H|%an|%ad|%s', '--date=iso', '--', filePath], repoPath);
  });

  ipcMain.handle('git:grepHistory', async (_, { repoPath, pattern, user, since, until }) => {
      // git log -G "pattern" --name-only to see which files changed
      const args = ['log', `-G${pattern}`, '--pretty=format:COMMIT|%H|%an|%ad|%s', '--date=iso', '--name-only'];
      if (user) args.push(`--author=${user}`);
      if (since) args.push(`--since=${since}`);
      if (until) args.push(`--until=${until}`);

      const output = await runGit(args, repoPath);
      const results = [];
      const lines = output.split('\n');
      let currentCommit = null;

      for (const line of lines) {
          if (line.startsWith('COMMIT|')) {
              const [_, id, author, date, message] = line.split('|');
              currentCommit = { id, author, date, message, type: 'git', files: [] };
              results.push(currentCommit);
          } else if (line.trim() && currentCommit) {
              currentCommit.files.push(line.trim());
          }
      }
      return results;
  });

  ipcMain.handle('git:getSearchSnippet', async (_, { repoPath, commitId, pattern, filePath }) => {
      try {
          // Use git show with -G to find the diff lines containing the pattern
          const output = await runGit(['show', `-G${pattern}`, commitId, '--', filePath], repoPath, { trim: false });
          
          // Find the first matching line in the diff and return some context
          const lines = output.split('\n');
          const matchIndex = lines.findIndex(l => l.includes(pattern) && (l.startsWith('+') || l.startsWith('-')));
          
          if (matchIndex !== -1) {
              const start = Math.max(0, matchIndex - 3);
              const end = Math.min(lines.length, matchIndex + 4);
              return lines.slice(start, end).join('\n');
          }
          return null;
      } catch (e) {
          console.error("Failed to get snippet:", e);
          return null;
      }
  });

  // --- SEARCH INDEXING LOGIC ---
  let searchIndex = null; 

  ipcMain.handle('search:rebuildIndex', async (_, repoPath) => {
      console.log(`[Indexer] Rebuilding index for: ${repoPath}`);
      const index = {
          files: {}, // path -> content
          snapshots: {}, // id -> content
          terms: {} // term -> { files: [], snapshots: [] }
      };

      try {
          // 1. Index Current Files
          const indexSettings = await readAppSettings();
          const indexExcludes = indexSettings.excludes || [];
          let files = await glob.glob('**/*', {
              cwd: repoPath,
              nodir: true,
              ignore: ['**/.git/**', '**/.history/**', '**/node_modules/**', '**/dist/**', '**/.next/**']
          });
          if (indexExcludes.length > 0) {
              files = files.filter(file => !isPathExcluded(file, indexExcludes));
          }

          for (const file of files) {
              try {
                  const content = fs.readFileSync(path.join(repoPath, file), 'utf8');
                  if (content.length > 100000) continue; // Skip huge files
                  
                  index.files[file] = content;
                  const words = new Set(content.toLowerCase().match(/\b\w{3,}\b/g) || []);
                  words.forEach(word => {
                      if (!index.terms[word]) index.terms[word] = { f: [], s: [] };
                      index.terms[word].f.push(file);
                  });
              } catch (e) {}
          }

          // 2. Index Chronos History
          const historyDir = await findChronosHistoryDir(repoPath);
          if (historyDir) {
              const indexPath = path.join(historyDir, 'index.json');
              if (fs.existsSync(indexPath)) {
                  const snapshots = JSON.parse(fs.readFileSync(indexPath, 'utf8')).snapshots || [];
                  for (const snap of snapshots) {
                      try {
                          const snapPath = path.join(historyDir, snap.storagePath || snap.id);
                          if (fs.existsSync(snapPath)) {
                              const content = fs.readFileSync(snapPath, 'utf8');
                              index.snapshots[snap.id] = { 
                                  ...snap, // Full original snapshot object
                                  message: snap.label || snap.eventType,
                                  author: 'Local User',
                                  date: new Date(snap.timestamp).toISOString(),
                                  content: content // Keep content for snippets
                              };
                              const words = new Set(content.toLowerCase().match(/\b\w{3,}\b/g) || []);
                              words.forEach(word => {
                                  if (!index.terms[word]) index.terms[word] = { f: [], s: [] };
                                  index.terms[word].s.push(snap.id);
                              });
                          }
                      } catch (e) {}
                  }
              }
          }

          searchIndex = index;
          // Optionally save to disk
          const indexPath = path.join(historyDir || repoPath, 'search_index.json');
          fs.writeFileSync(indexPath, JSON.stringify(index));
          
          return { success: true, fileCount: files.length, termCount: Object.keys(index.terms).length };
      } catch (e) {
          console.error("Indexing failed:", e);
          throw e;
      }
  });

  ipcMain.handle('search:indexedSearch', async (_, { query, user, since, until }) => {
      if (!searchIndex) return { files: [], snapshots: [] };
      
      const words = query.toLowerCase().match(/\b\w{3,}\b/g) || [];
      if (words.length === 0) return { files: [], snapshots: [] };

      let fileMatches = new Set();
      let snapMatches = new Set();

      words.forEach((word, i) => {
          const match = searchIndex.terms[word];
          if (match) {
              if (i === 0) {
                  match.f.forEach(f => fileMatches.add(f));
                  match.s.forEach(s => snapMatches.add(s));
              } else {
                  fileMatches = new Set([...fileMatches].filter(f => match.f.includes(f)));
                  snapMatches = new Set([...snapMatches].filter(s => match.s.includes(s)));
              }
          } else {
              fileMatches.clear();
              snapMatches.clear();
          }
      });

      // Filter by user and date
      let filteredSnapshots = Array.from(snapMatches).map(id => ({ 
          id, 
          ...searchIndex.snapshots[id] 
      }));

      if (user) {
          filteredSnapshots = filteredSnapshots.filter(s => s.author.toLowerCase().includes(user.toLowerCase()));
      }
      if (since) {
          const sinceDate = new Date(since);
          filteredSnapshots = filteredSnapshots.filter(s => new Date(s.date) >= sinceDate);
      }
      if (until) {
          const untilDate = new Date(until);
          filteredSnapshots = filteredSnapshots.filter(s => new Date(s.date) <= untilDate);
      }

      // Helper to get snippet
      const getSnippet = (content, query) => {
          if (!content) return null;
          const index = content.toLowerCase().indexOf(query.toLowerCase());
          if (index === -1) return null;
          const start = Math.max(0, index - 40);
          const end = Math.min(content.length, index + query.length + 40);
          let snippet = content.substring(start, end);
          if (start > 0) snippet = '...' + snippet;
          if (end < content.length) snippet = snippet + '...';
          return snippet;
      };

      return {
          files: Array.from(fileMatches).map(f => ({ 
              path: f,
              snippet: getSnippet(searchIndex.files[f], query)
          })),
          snapshots: filteredSnapshots.map(s => ({
              ...s,
              snippet: getSnippet(s.content, query)
          }))
      };
  });

  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Repository Folder'
    });
    return { canceled, filePaths: filePaths || [] };
  });

  ipcMain.handle('git:showBinary', async (_, { repoPath, ref, filePath }) => {
      return new Promise((resolve, reject) => {
          const child = spawn('git', ['show', `${ref}:${filePath}`], { cwd: repoPath });
          const chunks = [];
          child.stdout.on('data', c => chunks.push(c));
          child.on('close', (code) => {
              if (code === 0) {
                  const buffer = Buffer.concat(chunks);
                  resolve(buffer.toString('base64'));
              } else {
                  resolve(null);
              }
          });
      });
  });

  ipcMain.handle('git:diffDetails', async (_, { repoPath, filePath, staged }) => {
      const patchArgs = staged ? ['diff', '--staged', '--', filePath] : ['diff', '--', filePath];
      const patch = await runGit(patchArgs, repoPath).catch(() => '');

      let original = '';
      let modified = '';

      if (staged) {
          try {
              original = await runGit(['show', `HEAD:${filePath}`], repoPath);
          } catch (e) {}
          try {
              modified = await runGit(['show', `:${filePath}`], repoPath);
          } catch (e) {}
      } else {
          try {
              original = await runGit(['show', `:${filePath}`], repoPath);
          } catch (e) {
          }
          try {
              const normalizedPath = path.normalize(filePath);
              if (fs.existsSync(normalizedPath)) {
                  modified = fs.readFileSync(normalizedPath, 'utf8');
              }
          } catch (e) {}
      }

      return { patch, original, modified };
  });

  ipcMain.handle('git:compareFiles', async (_, { repoPath, pathA, refA, pathB, refB }) => {
      console.log(`[Compare] Starting comparison: ${pathA} vs ${pathB}`);
      let contentA = '';
      let contentB = '';
      
      const getFileContent = async (filePath, gitRef) => {
          if (!filePath) return '';
          // Normalize path for Git (always use forward slashes)
          const normalizedFilePath = filePath.replace(/\\/g, '/');
          try {
              if (gitRef) {
                  console.log(`[Compare] Fetching git content for ${gitRef}:${normalizedFilePath}`);
                  return await runGit(['show', `${gitRef}:${normalizedFilePath}`], repoPath, { trim: false });
              } else {
                  // 1. Check if path is absolute
                  if (path.isAbsolute(filePath)) {
                      if (fs.existsSync(filePath)) return await fs.promises.readFile(filePath, 'utf8');
                      return '';
                  }

                  // 2. Check if it's a relative history path
                  if (filePath.startsWith('.history/')) {
                      const historyDir = await findChronosHistoryDir(repoPath);
                      if (historyDir) {
                          const storageName = filePath.substring(9); 
                          const fullHistoryPath = path.join(historyDir, storageName);
                          if (fs.existsSync(fullHistoryPath)) {
                              return await fs.promises.readFile(fullHistoryPath, 'utf8');
                          }
                      }
                  }

                  // 3. Normal project relative path
                  const fullPath = path.join(repoPath, filePath);
                  if (fs.existsSync(fullPath)) {
                      return await fs.promises.readFile(fullPath, 'utf8');
                  }
                  return '';
              }
          } catch (e) {
              console.warn(`[Compare] Error reading ${normalizedFilePath} (${gitRef || 'Working'}):`, e.message);
              // For comparison, we return empty string if the file/ref doesn't exist
              return '';
          }
      };

      contentA = await getFileContent(pathA, refA);
      contentB = await getFileContent(pathB, refB);
      
      console.log(`[Compare] Content A size: ${contentA.length}, Content B size: ${contentB.length}`);

      const tmpDir = app.getPath('temp');
      const fileATmp = path.join(tmpDir, `chronos_a_${Date.now()}.txt`);
      const fileBTmp = path.join(tmpDir, `chronos_b_${Date.now()}.txt`);

      try {
          fs.writeFileSync(fileATmp, contentA);
          fs.writeFileSync(fileBTmp, contentB);

          let patch = '';
          try {
              // git diff --no-index returns 1 if diffs found, which execFile treats as error
              patch = await runGit(['diff', '--no-index', '--color=never', fileATmp, fileBTmp], repoPath);
          } catch (e) {
              // Capture stdout from the error object if git diff found differences
              if (e.stdout || e.stderr) {
                  patch = e.stdout || e.stderr;
              } else if (e.message && e.message.includes('diff')) {
                  patch = e.message; 
              }
          }

          return { 
              patch: patch || '', 
              original: contentA, 
              modified: contentB 
          };
      } catch (err) {
          console.error("[Compare] Diff process error:", err);
          return { patch: '', original: contentA, modified: contentB };
      } finally {
          try {
              if (fs.existsSync(fileATmp)) fs.unlinkSync(fileATmp);
              if (fs.existsSync(fileBTmp)) fs.unlinkSync(fileBTmp);
          } catch (e) {}
      }
  });

  ipcMain.handle('dialog:saveFile', async (_, { defaultPath, filters }) => {
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
          defaultPath,
          filters: [{ name: 'Chronos Diff Files', extensions: ['cdiff'] }]
      });
      return { canceled, filePath };
  });

  ipcMain.handle('fs:readFile', async (_, filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        return await fs.promises.readFile(filePath, 'utf8');
      }
      return null;
    } catch (e) {
      console.error(`Failed to read file ${filePath}:`, e);
      throw e;
    }
  });

  ipcMain.handle('fs:readChronosSnapshotContent', async (_, { repoPath, storagePath }) => {
    try {
      const historyFolderPath = await findChronosHistoryDir(repoPath);
      if (!historyFolderPath) throw new Error("History folder not found");
      
      const snapshotFilePath = path.isAbsolute(storagePath) ? storagePath : path.join(historyFolderPath, storagePath);

      if (!fs.existsSync(snapshotFilePath)) {
        throw new Error(`Snapshot file not found: ${snapshotFilePath}`);
      }

      const content = await fs.promises.readFile(snapshotFilePath, 'utf8');
      return content;
    } catch (error) {
      console.error(`Failed to read snapshot content:`, error);
      throw new Error(`Failed to read snapshot content: ${error.message}`);
    }
  });

  ipcMain.handle('fs:readChronosHistoryIndex', async (_, repoPath) => {
    try {
      const historyFolderPath = await findChronosHistoryDir(repoPath);
      if (!historyFolderPath) return { snapshots: [] };

      const indexPath = path.join(historyFolderPath, 'index.json');
      if (!fs.existsSync(indexPath)) {
        return { snapshots: [] };
      }

      const data = await fs.promises.readFile(indexPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Failed to read Chronos History index for ${repoPath}:`, error);
      throw new Error(`Failed to read Chronos History index: ${error.message}`);
    }
  });

  ipcMain.handle('fs:readDirectory', async (_, directoryPath) => {
    try {
      const entries = await fs.promises.readdir(directoryPath, { withFileTypes: true });
      return entries.map(entry => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
      }));
    } catch (error) {
      console.error(`Failed to read directory ${directoryPath}:`, error);
      throw new Error(`Failed to read directory: ${error.message}`);
    }
  });

  ipcMain.handle('fs:readAllFiles', async (_, directoryPath) => {
    try {
      const settings = await readAppSettings();
      const excludes = settings.excludes || [];
      let files = await glob.glob('**/*', {
        cwd: directoryPath,
        nodir: true,
        ignore: ['**/.git/**', '**/.history/**', '**/node_modules/**', '**/dist/**', '**/.next/**']
      });
      if (excludes.length > 0) {
        files = files.filter(file => !isPathExcluded(file, excludes));
      }
      return files.map(file => ({
        name: path.basename(file),
        isDirectory: false,
        isFile: true,
        path: path.join(directoryPath, file).replace(/\\/g, '/') // Ensure forward slashes for consistency
      }));
    } catch (error) {
      console.error(`Failed to read all files in ${directoryPath}:`, error);
      throw new Error(`Failed to read all files: ${error.message}`);
    }
  });

  ipcMain.handle('fs:appendFile', async (_, { path: filePath, content }) => {
      const normalizedPath = path.normalize(filePath);
      return new Promise((resolve, reject) => {
          fs.appendFile(normalizedPath, content, (err) => {
              if (err) reject(err);
              else resolve();
          });
      });
  });

  ipcMain.handle('fs:writeFile', async (_, { path: filePath, content }) => {
      const normalizedPath = path.normalize(filePath);
      return new Promise((resolve, reject) => {
          fs.writeFile(normalizedPath, content, (err) => {
              if (err) reject(err);
              else resolve();
          });
      });
  });

  // Chronos Excludes IPC handlers
  ipcMain.handle('chronos:getExcludes', async () => {
      const settings = await readAppSettings();
      return settings.excludes || [];
  });

  ipcMain.handle('chronos:setExcludes', async (_, excludes) => {
      const settings = await readAppSettings();
      settings.excludes = excludes;
      await writeAppSettings(settings);
  });

  // Utility function to check if a path is excluded
  function isPathExcluded(filePath, excludes) {
      const normalizedFilePath = path.normalize(filePath).replace(/\\/g, '/'); // Normalize and ensure forward slashes for minimatch
      for (const pattern of excludes) {
          if (minimatch.minimatch(normalizedFilePath, pattern, { dot: true })) { // dot: true to match dotfiles
              return true;
          }
      }
      return false;
  }


  createWindow();
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
