import {BrowserWindow, app, screen} from 'electron';
import net from 'net';
import fs from 'fs';
import path from 'path';

const env = process.env.NODE_ENV || 'development';

// Using hardware acceleration with transparent window causes high CPU usage on Windows.
app.disableHardwareAcceleration();

const socketAddrBase = process.platform === 'win32' ? '\\\\.\\pipe\\gopher.' : '/tmp/gopher.';

enum Direction {
    LTOR = 1,
    RTOL = -1
};

enum JumpState {
    None,
    Jumping
};

type Message = {
    method: string;
    message: string|null;
    accessory: number|null;
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
    msgQueue: Message[];
    messagePostTime: number|null;
    accessories: any[];
};

const runGopher = (state: DisplayState) => {
    state.timeoutId = setTimeout(() => {runGopher(state);}, 33);

    if (state.messagePostTime !== null) {
        if (Date.now() - state.messagePostTime < 2000) {
            return;
        } else {
            state.mainWindow.webContents.send('show-message', null);
            state.messagePostTime = null;
        }
    }

    if (Math.random() < 0.0003) {
        const accessoryType = (Math.random() * (state.accessories.length + 1)) >> 0;
        if (accessoryType === 0) {
            state.mainWindow.webContents.send('set-accessory', null);
        } else {
            state.mainWindow.webContents.send('set-accessory', state.accessories[accessoryType - 1]);
        }
    }

    const dLeft = state.displayBounds.x;
    const dRight = state.displayBounds.x + state.displayBounds.width;
    const dBottom = state.displayBounds.y + state.displayBounds.height;

    state.mainWindow.setPosition(state.xPos >> 0, state.yPos >> 0);
    state.mainWindow.setSize(200, 200);

    let dx = state.walkSpeed * state.direction;

    if (state.jump === JumpState.None) {
        if (state.msgQueue.length > 0) {
            const msg = <Message>state.msgQueue.shift();
            if (msg.method === 'jump') {
                state.jump = JumpState.Jumping;
                state.framesSinceJumpStart = 0;
                state.mainWindow.webContents.send('set-walking', false);
            } else if (msg.method === 'message') {
                state.messagePostTime = Date.now();
                state.mainWindow.webContents.send('show-message', msg.message);
            } else if (msg.method === 'accessory') {
                const accessoryType = msg.accessory! <= state.accessories.length ? msg.accessory! : 0;
                if (accessoryType === 0) {
                    state.mainWindow.webContents.send('set-accessory', null);
                } else {
                    state.mainWindow.webContents.send('set-accessory', state.accessories[accessoryType - 1]);
                }
            }
        } else if (Math.random() < 0.007) {
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

const loadAccessories = (): any[] => {
    let result: any[] = [];
    try {
        const data = fs.readFileSync(path.resolve(__dirname, 'accessories/accessories.json'), {encoding: 'utf-8'});
        result = JSON.parse(data);
    } catch (e: any) {
        console.error('Failed to read accessories');
        console.error(e);
    }
    return result;
}

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        transparent: true,
        frame: false
    });
    if (env === 'development') {
        mainWindow.webContents.openDevTools({mode: 'detach'});
    } else {
        mainWindow.setIgnoreMouseEvents(true);
        mainWindow.setFocusable(false);
    }
    mainWindow.setSize(200, 200);
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
        walkSpeed: 5 + (Math.random() - 0.5) * 1.5,
        msgQueue: <Message[]>[],
        messagePostTime: null,
        accessories: loadAccessories()
    };

    runGopher(state);

    mainWindow.once('closed', () => {
        if (state.timeoutId !== null) {
            clearTimeout(state.timeoutId);
        }
    });

    const server = new net.Server();
    server.on('connection', (socket: net.Socket) => {
        let allData = '';
        socket.on('data', (data: Buffer) => {
            allData += data;
        });
        socket.on('end', () => {
            try {
                const msg = <Message>JSON.parse(allData);
                if (msg.method === 'close') {
                    mainWindow.close();
                } else if (msg.method === 'jump') {
                    state.msgQueue.push(msg);
                } else if (msg.method === 'message') {
                    if (msg.message === null) {
                        throw 'Message must be set';
                    }
                    state.msgQueue.push(msg);
                } else if (msg.method === 'accessory') {
                    if (msg.accessory == null) {
                        msg.accessory = 0;
                    }
                    state.msgQueue.push(msg);
                } else {
                    throw 'Unknown method: ' + msg.method;
                }
            } catch (e: any) {
                console.log(e);
            }
        });
    });
    server.listen(socketAddrBase + process.pid);
};

app.whenReady().then(createWindow);
app.once('window-all-closed', () => {
    if (process.platform !== 'win32') {
        fs.unlinkSync(socketAddrBase + process.pid);
    }
    app.quit();
});
