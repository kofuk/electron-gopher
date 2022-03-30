import {BrowserWindow, app, screen} from 'electron';

const env = process.env.NODE_ENV || 'development';

// Using hardware acceleration with transparent window causes high CPU usage on Windows.
app.disableHardwareAcceleration();

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
    timeoutId: NodeJS.Timeout|null;
    displayBounds: Electron.Rectangle;
    xPos: number;
    yPos: number;
    direction: Direction;
    jump: JumpState;
    framesSinceJumpStart: number;
    walkSpeed: number;
};

const runGopher = (state: DisplayState) => {
    state.timeoutId = setTimeout(() => {runGopher(state);}, 33);

    const dLeft = state.displayBounds.x;
    const dRight = state.displayBounds.x + state.displayBounds.width;
    const dBottom = state.displayBounds.y + state.displayBounds.height;

    state.mainWindow.setPosition(state.xPos >> 0, state.yPos >> 0);

    let dx = state.walkSpeed * state.direction;

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
            state.yPos = dBottom - 200;
        } else {
            dx /= 2;
            state.yPos = dBottom - 200 - (Math.sin(state.framesSinceJumpStart / 60 * Math.PI) * 120);
        }
    }

    state.xPos += dx;

    if (state.direction === Direction.LTOR) {
        if (state.xPos >= dRight - 200 || (state.jump !== JumpState.Jumping && Math.random() < 0.002)) {
            state.direction = Direction.RTOL;
            state.mainWindow.webContents.send('set-flipped', true);
        }
    } else {
        if (state.xPos <= dLeft || (state.jump !== JumpState.Jumping && Math.random() < 0.002)) {
            state.direction = Direction.LTOR;
            state.mainWindow.webContents.send('set-flipped', false);
        }
    }
};

const createWindow = () => {
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
    if (env === 'development') {
        mainWindow.webContents.openDevTools({mode: 'detach'});
    } else {
        mainWindow.setIgnoreMouseEvents(true);
        mainWindow.setFocusable(false);
    }
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setSkipTaskbar(true);
    mainWindow.loadURL(`file://${__dirname}/index.html`);

    const workArea = screen.getPrimaryDisplay().workArea;

    const state = {
        mainWindow,
        timeoutId: null,
        displayBounds: workArea,
        xPos: workArea.x,
        yPos: workArea.y + workArea.width - 200,
        direction: Direction.LTOR,
        jump: JumpState.None,
        framesSinceJumpStart: 0,
        walkSpeed: 4 + (Math.random() - 0.5) * 1.5
    };

    runGopher(state);

    mainWindow.once('closed', () => {
        if (state.timeoutId !== null) {
            clearTimeout(state.timeoutId);
        }
    });
};

app.whenReady().then(createWindow);
app.once('window-all-closed', () => app.quit());
