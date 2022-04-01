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

class GopherController {
    private mainWindow: BrowserWindow;
    private timeoutId: NodeJS.Timeout|null = null;
    private displayBounds: Electron.Rectangle;
    private xPos: number;
    private yPos: number;
    private direction: Direction;
    private jumpState: JumpState;
    private framesSinceJumpStart: number = 0;
    private walkSpeed: number;
    private msgQueue: Message[] = [];
    private messagePostTime: number|null = null;
    private accessories: any[] = [];

    constructor(mainWindow: BrowserWindow, displayBounds: Electron.Rectangle) {
        this.mainWindow = mainWindow;
        this.displayBounds = displayBounds;
        this.xPos = displayBounds.x;
        this.yPos = displayBounds.y + displayBounds.width - 200;
        this.direction = Direction.LTOR;
        this.jumpState = JumpState.None;
        this.walkSpeed = 5;
    };

    setWalkSpeed = (speed: number) => {
        this.walkSpeed = speed;
    };

    setAccessories = (accessories: any[]) => {
        this.accessories = accessories;
    };

    private changeDirection = () => {
        this.direction = this.direction == Direction.LTOR ? Direction.RTOL : Direction.LTOR;
        this.mainWindow.webContents.send('set-flipped', this.direction == Direction.RTOL);
    };

    private randomOccurrence = (rate: number): boolean =>  {
        return Math.random() < rate;
    };

    private jump = () => {
        this.jumpState = JumpState.Jumping;
        this.framesSinceJumpStart = 0;
        this.mainWindow.webContents.send('set-walking', false);
    };

    private finishJump = () => {
        this.jumpState = JumpState.None;
        this.mainWindow.webContents.send('set-walking', true);
    };

    private handleWalkDirection = () => {
        const left = this.displayBounds.x;
        const right = this.displayBounds.x + this.displayBounds.width;

        const isRightmost = this.direction === Direction.LTOR && this.xPos >= right - 200;
        const isLeftmost = this.direction === Direction.RTOL && this.xPos <= left;
        const shouldRandomTurn = this.jumpState !== JumpState.Jumping && this.randomOccurrence(0.002);

        if (isRightmost || isLeftmost || shouldRandomTurn) {
            this.changeDirection();
        }
    };

    private attachAccessory = (accessoryType: number) => {
        if (accessoryType === 0) {
            this.mainWindow.webContents.send('set-accessory', null);
        } else {
            this.mainWindow.webContents.send('set-accessory', this.accessories[accessoryType - 1]);
        }
    };

    private attachRandomAccessory = () => {
        const accessoryType = (Math.random() * (this.accessories.length + 1)) >> 0;
        this.attachAccessory(accessoryType);
    };

    private say = (text: string) => {
        this.messagePostTime = Date.now();
        this.mainWindow.webContents.send('show-message', text);

    };

    private unsay = () => {
        this.mainWindow.webContents.send('show-message', null);
        this.messagePostTime = null;
    };

    private handleMessage = (): boolean => {
        if (this.msgQueue.length == 0) {
            return false;
        }

        const msg = <Message>this.msgQueue.shift();
        if (msg.method === 'jump') {
            this.jump();
        } else if (msg.method === 'message') {
            this.say(msg.message!);
        } else if (msg.method === 'accessory') {
            const accessoryType = msg.accessory! <= this.accessories.length ? msg.accessory! : 0;
            this.attachAccessory(accessoryType);
        }

        return true;
    };

    run = () => {
        this.timeoutId = setTimeout(this.run, 33);

        if (this.messagePostTime !== null) {
            if (Date.now() - this.messagePostTime < 2000) {
                return;
            } else {
                this.unsay();
            }
        }

        this.mainWindow.setPosition(this.xPos >> 0, this.yPos >> 0);
        this.mainWindow.setSize(200, 200);

        let dx = this.walkSpeed * this.direction;

        if (this.jumpState == JumpState.None) {
            if (!this.handleMessage() && this.randomOccurrence(0.007)) {
                this.jump();
            }
        } else {
            this.framesSinceJumpStart++;

            const bottom = this.displayBounds.y + this.displayBounds.height;
            if (this.framesSinceJumpStart > 60) {
                this.finishJump();
                this.yPos = bottom - 200;
            } else {
                dx /= 2;
                this.yPos = bottom - 200 - (Math.sin(this.framesSinceJumpStart / 60 * Math.PI) * 120);
            }
        }

        this.xPos += dx;

        this.handleWalkDirection();
        if (this.randomOccurrence(0.0003)) {
            this.attachRandomAccessory();
        }
    };

    stop = () => {
        if (this.timeoutId != null) {
            clearTimeout(this.timeoutId!);
        }
    };

    postMessage = (msg: Message) => {
        this.msgQueue.push(msg);
    };
}

const loadAccessories = (): any[] => {
    let result: any[] = [];
    try {
        const data = fs.readFileSync(path.resolve(__dirname, 'res/accessories/accessories.json'), {encoding: 'utf-8'});
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

    const gopher = new GopherController(mainWindow, workArea);
    gopher.setAccessories(loadAccessories());
    gopher.setWalkSpeed(5 + (Math.random() - 0.5) * 1.5);
    gopher.run();

    mainWindow.once('closed', () => {
        gopher.stop();
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
                    gopher.postMessage(msg);
                } else if (msg.method === 'message') {
                    if (msg.message === null) {
                        throw 'Message must be set';
                    }
                    gopher.postMessage(msg);
                } else if (msg.method === 'accessory') {
                    if (msg.accessory == null) {
                        msg.accessory = 0;
                    }
                    gopher.postMessage(msg);
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
