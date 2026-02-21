const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const glob = require('glob');

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

function createMenu() {
    const isMac = process.platform === 'darwin';
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
                        }
                    }
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
                { type: 'separator' },
                {
                    label: 'Learn More',
                    click: async () => {
                        await shell.openExternal('https://github.com/IldioMartins/Chronos-History-Diff-App');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function runGit(command, repoPath, options = { trim: true }) {
  const normalizedPath = path.normalize(repoPath);
  
  return new Promise((resolve, reject) => {
      exec(command, { 
          cwd: normalizedPath, 
          maxBuffer: 1024 * 1024 * 10 
      }, (error, stdout, stderr) => {
          if (error) {
              const errorMessage = stderr ? stderr.trim() : error.message;
              reject(new Error(errorMessage));
          } else {
              const output = options.trim ? stdout.trim() : stdout;
              resolve(output);
          }
      });
  });
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

async function findChronosHistoryDir(repoPath) {
    console.log(`[Storage] Searching history for: ${repoPath}`);
    
    const saveInProject = await getChronosSetting(repoPath, 'saveInProjectFolder', false);
    console.log(`[Storage] chronos.saveInProjectFolder is: ${saveInProject}`);

    if (saveInProject) {
        // Prefer local .history folder
        const localHistory = path.join(repoPath, '.history');
        if (fs.existsSync(localHistory) && fs.existsSync(path.join(localHistory, 'index.json'))) {
            console.log(`[Storage] Found local history at: ${localHistory}`);
            return localHistory;
        }
    }

    // Try VS Code workspaceStorage
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

    // Fallback to local .history if not found in workspaceStorage and not already tried
    if (!saveInProject) {
        const localHistory = path.join(repoPath, '.history');
        if (fs.existsSync(localHistory) && fs.existsSync(path.join(localHistory, 'index.json'))) {
            console.log(`[Storage] Fallback: Found local history at: ${localHistory}`);
            return localHistory;
        }
    }

    console.log(`[Storage] No history folder found for ${repoPath}`);
    return null;
}



app.whenReady().then(() => {
  createMenu();
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

  ipcMain.handle('git:fileHistory', async (_, { repoPath, filePath }) => {
      // Format: commitHash|authorName|authorDate|subject
      const command = `git log --follow --pretty=format:"%H|%an|%ad|%s" --date=iso -- "${filePath}"`;
      return await runGit(command, repoPath);
  });

  ipcMain.handle('git:log', async (_, { repoPath, count }) => {
      const command = `git log -n ${count || 50} --pretty=format:"%H|%an|%ad|%s" --date=iso`;
      return await runGit(command, repoPath);
  });

  ipcMain.handle('git:show', async (_, { repoPath, ref, filePath }) => {
      const command = `git show "${ref}:${filePath}"`;
      return await runGit(command, repoPath, { trim: false });
  });

  ipcMain.handle('git:status', async (_, repoPath) => {
      const command = `git status --porcelain`;
      return await runGit(command, repoPath);
  });

  ipcMain.handle('git:branches', async (_, repoPath) => {
      // Format: objectname|refname|* if current
      const command = `git for-each-ref --format="%(objectname)|%(refname)|%(HEAD)" refs/heads/ refs/remotes/`;
      return await runGit(command, repoPath);
  });

  ipcMain.handle('git:config', async (_, repoPath) => {
      const command = `git config --list`;
      return await runGit(command, repoPath);
  });

  ipcMain.handle('git:setConfig', async (_, { repoPath, key, value }) => {
      const command = `git config "${key}" "${value}"`;
      return await runGit(command, repoPath);
  });

  ipcMain.handle('git:lsFiles', async (_, repoPath) => {
      const command = `git ls-files`;
      return await runGit(command, repoPath);
  });

  ipcMain.handle('git:commitsForDate', async (_, { repoPath, since, until }) => {
      // Get detailed commits for AI analysis
      // Format: hash|author|date|message
      // We also want to know which files were changed
      const command = `git log --since="${since}" --until="${until}" --pretty=format:"%H|%an|%ad|%s" --name-only`;
      const output = await runGit(command, repoPath);
      
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
      const command = `git log -L ${startLine},${endLine}:"${filePath}" --pretty=format:"%H|%an|%ad|%s" --date=iso`;
      return await runGit(command, repoPath);
  });

  ipcMain.handle('git:searchHistory', async (_, { repoPath, filePath, searchText }) => {
      // git log -S "text" <file>
      const command = `git log -S "${searchText}" --pretty=format:"%H|%an|%ad|%s" --date=iso -- "${filePath}"`;
      return await runGit(command, repoPath);
  });

  ipcMain.handle('git:grepHistory', async (_, { repoPath, pattern }) => {
      // git log -G "pattern"
      const command = `git log -G "${pattern}" --pretty=format:"%H|%an|%ad|%s" --date=iso`;
      return await runGit(command, repoPath);
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
      const patchCmd = staged ? `git diff --staged -- "${filePath}"` : `git diff -- "${filePath}"`;
      const patch = await runGit(patchCmd, repoPath).catch(() => '');
      
      let original = '';
      let modified = '';

      if (staged) {
          try {
              original = await runGit(`git show HEAD:"${filePath}"`, repoPath);
          } catch (e) {}
          try {
              modified = await runGit(`git show ":${filePath}"`, repoPath);
          } catch (e) {}
      } else {
          try {
              original = await runGit(`git show ":${filePath}"`, repoPath);
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
          try {
              if (gitRef) {
                  return await runGit(`git show "${gitRef}:${filePath}"`, repoPath);
              } else {
                  // 1. Check if path is absolute
                  if (path.isAbsolute(filePath)) {
                      if (fs.existsSync(filePath)) return await fs.promises.readFile(filePath, 'utf8');
                      return '';
                  }

                  // 2. Check if it's a relative history path that needs resolving
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
              console.error(`[Compare] Error reading ${filePath}:`, e);
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
              // git diff --no-index returns 1 if diffs found, which exec treats as error
              patch = await runGit(`git diff --no-index --color=never "${fileATmp}" "${fileBTmp}"`, repoPath);
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
      const files = await glob.glob('**/*', { 
        cwd: directoryPath, 
        nodir: true,
        ignore: ['**/.git/**', '**/.history/**', '**/node_modules/**', '**/dist/**', '**/.next/**']
      });
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
