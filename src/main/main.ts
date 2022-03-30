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
    message?: string;
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

    const dLeft = state.displayBounds.x;
    const dRight = state.displayBounds.x + state.displayBounds.width;
    const dBottom = state.displayBounds.y + state.displayBounds.height;

    state.mainWindow.setPosition(state.xPos >> 0, state.yPos >> 0);

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
        walkSpeed: 5 + (Math.random() - 0.5) * 1.5,
        msgQueue: <Message[]>[],
        messagePostTime: null
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

const getAllGophers = (): string[] => {
    const prefix = process.platform === 'win32' ? '\\\\.\\pipe\\' : '/tmp';
    const result: string[] = [];
    for (const file of fs.readdirSync(prefix)) {
        if (file.match(/^gopher\.[0-9]+/)) {
            result.push(path.join(prefix, file));
        }
    }
    return result;
};

function* sendToGophers(gophers: string[], msg: Message) {
    for (const gopher of gophers) {
        yield new Promise((resolve, reject) => {
            const sock = net.connect(gopher, () => {
                sock.write(JSON.stringify(msg));
                sock.destroy();
            });
            sock.on('error', (err) => {
                if (process.platform !== 'win32') {
                    fs.unlinkSync(gopher);
                }
                reject(err);
            });
            sock.on('close', () => {
                resolve(0);
            });
        });
    }
};

const sendToAllGophers = (msg: Message) => {
    const gophers = getAllGophers();
    Promise.allSettled(sendToGophers(gophers, msg)).then((results) => {
        for (const result of results) {
            if (result.status === 'rejected') {
                console.error('Failed to send message to a Gopher instance: ' + result.reason);
            }
        }
        process.exit(0);
    });
};

const sendToOneGopher = async (msg: Message) => {
    const gophers = getAllGophers().map((e) => {return {e, v: Math.random()}}).sort((a, b) => a.v - b.v).map((e) => e.e);
    for (const task of sendToGophers(gophers, msg)) {
        try {
            await task;
        } catch(_: any) {
            continue;
        }
        break;
    }
    process.exit(0);
};

const postJumpGopher = () => {
    sendToAllGophers({
        method: 'jump'
    });
};

const postCloseGopher = () => {
    sendToAllGophers({
        method: 'close'
    });
};

const postShowMessage = (msg: string) => {
    sendToOneGopher({
        method: 'message',
        message: msg
    })
}

const validFlags = ['--help', '-j', '-m',  '-x'];

if (validFlags.map((e) => process.argv.includes(e)).find((e) => e)) {
    for (const flag of validFlags) {
        if (process.argv.includes(flag)) {
            if (flag === '--help') {
                console.log('usage: electron-gopher      OR')
                console.log('usage: electron-gopher -j   OR')
                console.log('usage: electron-gopher -x')
                console.log('')
                console.log('-j    Jump Gopher')
                console.log('-x    Exit all Gophers')
                process.exit(0);
            } else if (flag === '-j') {
                postJumpGopher();
            } else if (flag === '-x') {
                postCloseGopher();
            } else if (flag === '-m') {
                for (let i = 0; i < process.argv.length; i++) {
                    if (process.argv[i] == '-m') {
                        if (i + 1 < process.argv.length) {
                            postShowMessage(process.argv[i + 1]);
                            break;
                        } else {
                            console.error('Message required.');
                        }
                    }
                }
            }
        }
    }
} else {
    app.whenReady().then(createWindow);
    app.once('window-all-closed', () => {
        if (process.platform !== 'win32') {
            fs.unlinkSync(socketAddrBase + process.pid);
        }
        app.quit();
    });
}
