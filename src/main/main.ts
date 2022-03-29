import {BrowserWindow, app} from 'electron';

enum Direction {
    LTOR = 1,
    RTOL = -1
};

enum JumpState {
    None,
    Jumping
};

type DisplayState = {
    mainWindow: BrowserWindow;
    dw: number;
    dh: number;
    xPos: number;
    yPos: number;
    direction: Direction;
    jump: JumpState;
    framesSinceJumpStart: number;
};

const runGopher = (state: DisplayState) => {
    setTimeout(() => {runGopher(state);}, 33);

    state.mainWindow.setPosition(state.xPos, state.yPos);

    let dx = 4 * state.direction;

    if (state.jump === JumpState.None) {
        if (Math.random() < 0.007) {
            state.jump = JumpState.Jumping;
            state.framesSinceJumpStart = 0;
            state.mainWindow.webContents.send('set-walking', false);
        }
    } else {
        state.framesSinceJumpStart++;
        if (state.framesSinceJumpStart > 60) {
            state.jump = JumpState.None;
            state.mainWindow.webContents.send('set-walking', true);
            state.yPos = state.dh - 200;
        } else {
            dx /= 2;
            state.yPos = state.dh - 200 - (Math.sin(state.framesSinceJumpStart / 60 * Math.PI) * 120) >> 0;
        }
    }

    state.xPos += dx;

    if (state.direction === Direction.LTOR) {
        if (state.xPos >= state.dw - 200 || (state.jump !== JumpState.Jumping && Math.random() < 0.002)) {
            state.direction = Direction.RTOL;
            state.mainWindow.webContents.send('set-flipped', true);
        }
    } else {
        if (state.xPos <= 0 || (state.jump !== JumpState.Jumping && Math.random() < 0.002)) {
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
        yPos: height - 200,
        direction: Direction.LTOR,
        jump: JumpState.None,
        framesSinceJumpStart: 0,
    });
};

app.whenReady().then(createWindow);
app.once('window-all-closed', () => app.quit());
