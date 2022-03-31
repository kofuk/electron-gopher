import {ipcRenderer} from 'electron';


type AccessoryLayoutOption = {
    x: number;
    y: number;
    rotate: number;
};

type Accessory = {
    name: string;
    image: string;
    layout: AccessoryLayoutOption[];
};

const gopherFrames = [new Image, new Image, new Image];
for (const [i, f] of gopherFrames.entries()) {
    f.src = `out0${i + 1}.png`;
}
const messageFrame = new Image;
messageFrame.src = 'waiting.png';

class GopherAnimator {
    private startTime = 0;
    private frameReqId: number|undefined = undefined;
    private flipped = false;
    private walking = true;
    private showingMessage: boolean = false;
    private accessory: Accessory|null = null;
    private accessoryImage: HTMLImageElement|null = null;

    private requestNextFrame = () => {
        this.frameReqId = requestAnimationFrame(this.draw);
    };

    start = () => {
        this.startTime = Date.now();
        this.requestNextFrame();
    };

    stop = () => {
        if (typeof this.frameReqId !== 'undefined') {
            cancelAnimationFrame(this.frameReqId);
            this.frameReqId = undefined;
        }
    };

    setFlipped = (flipped: boolean) => {
        this.flipped = flipped;
    };

    setWalking = (walking: boolean) => {
        this.walking = walking;
    };

    showMessage = (msg: string|null) => {
        this.showingMessage = msg !== null;
        document.getElementById('messageText')!.innerText = msg || '';

    };

    setAccessory = (accessory: Accessory|null) => {
        if (accessory == null) {
            this.accessory = null;
            this.accessoryImage = null;
        } else {
            this.accessory = accessory;
            const image = new Image;
            image.src = `accessories/${accessory.image}`;
            this.accessoryImage = image;
        }
    };

    private renderAccessory = (ctx: CanvasRenderingContext2D, eFrameNum: number) => {
        if (this.accessory == null || this.accessoryImage == null || !this.accessoryImage.complete) {
            return;
        }

        const image = this.accessoryImage!;

        const layout = eFrameNum < this.accessory.layout.length
            ? this.accessory.layout[eFrameNum]
            : {x: 0, y: 0, rotate: 0};

        ctx.save();
        ctx.translate(layout.x, layout.y);
        ctx.translate(image.width / 2, image.height / 2);
        ctx.rotate(layout.rotate * Math.PI / 180);
        ctx.translate(-image.width / 2, -image.height / 2);
        ctx.drawImage(this.accessoryImage!, 0, 0);
        ctx.restore();
    };

    draw = () => {
        this.requestNextFrame();

        const currentTime = Date.now()
        const elapsedTime = currentTime - this.startTime;
        let frameNum = (elapsedTime / 16) >> 0;
        if (frameNum >= 20) {
            this.startTime = currentTime;
            frameNum = 0;
        }

        const canvas = <HTMLCanvasElement>document.getElementById('canvas');
        const ctx = canvas.getContext('2d')!!;
        ctx.clearRect(0, 0, 200, 200);

        if (this.showingMessage) {
            ctx.drawImage(messageFrame, 0, 0);
        } else {
            ctx.save();
            if (this.flipped) {
                ctx.scale(-1, 1);
                ctx.translate(-200, 0);
            }
            const eFrameNum = this.walking ? (Math.sin(frameNum / 20 * Math.PI) * 2.3 >> 0) : 0;
            ctx.translate(0, eFrameNum * 2);
            ctx.drawImage(gopherFrames[eFrameNum], 0, 0);

            this.renderAccessory(ctx, eFrameNum);

            ctx.restore();
        }
    };
}

addEventListener('load', () => {
    const animator = new GopherAnimator;
    animator.start();

    ipcRenderer.on('set-flipped', (_, msg) => {
        animator.setFlipped(<boolean>msg);
    });

    ipcRenderer.on('set-walking', (_, msg) => {
        animator.setWalking(<boolean>msg);
    });

    ipcRenderer.on('show-message', (_, msg) => {
        animator.showMessage(<string|null>msg);
    });

    ipcRenderer.on('set-accessory', (_, msg) => {
        animator.setAccessory(<Accessory|null>msg);
    });
});
