const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
        on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(event, ...args)),
        removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
        removeListener: (channel, func) => ipcRenderer.removeListener(channel, func),
    }
});
