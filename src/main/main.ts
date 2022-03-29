import {BrowserWindow, app} from 'electron';

enum Direction {
    LTOR = 1,
    RTOL = -1
};

type DisplayState = {
    mainWindow: BrowserWindow;
    dw: number;
    dh: number;
    xPos: number;
    direction: Direction;
};

const runGopher = (state: DisplayState) => {
    setTimeout(() => {runGopher(state);}, 33);

    state.mainWindow.setPosition(state.xPos, state.dh - 200);
    state.xPos = (state.xPos + 4 * state.direction) >> 0;
    if (state.direction === Direction.LTOR) {
        if (state.xPos >= state.dw - 200) {
            state.direction = Direction.RTOL;
            state.mainWindow.webContents.send('set-flipped', true);
        }
    } else {
        if (state.xPos <= 0) {
            state.direction = Direction.LTOR;
            state.mainWindow.webContents.send('set-flipped', false);
        }
    }
};

const createWindow = () => {
    const {screen} = require('electron');

    const {width, height} = screen.getPrimaryDisplay().workAreaSize;

    const mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
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

    runGopher({
        mainWindow,
        dw: width,
        dh: height,
        xPos: 0,
        direction: Direction.LTOR
    });
};

app.whenReady().then(createWindow);
app.once('window-all-closed', () => app.quit());
