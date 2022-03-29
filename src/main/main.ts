import {BrowserWindow, app} from 'electron';

const createWindow = () => {
    const {screen} = require('electron');

    const {width, height} = screen.getPrimaryDisplay().workAreaSize;

    const mainWindow = new BrowserWindow({
        transparent: true,
        frame: false,
        width: 200,
        height: 200
    });
    mainWindow.setIgnoreMouseEvents(true);
    mainWindow.setFocusable(false);
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setSkipTaskbar(true);
    mainWindow.setPosition(0, height - 200);
    mainWindow.loadURL(`file://${__dirname}/index.html`);
};

app.whenReady().then(createWindow);
app.once('window-all-closed', () => app.quit());
