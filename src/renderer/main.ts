import {ipcRenderer} from 'electron';

const gopherFrames = [new Image, new Image, new Image];
for (const [i, f] of gopherFrames.entries()) {
    f.src = `out0${i + 1}.png`;
}

class GopherAnimator {
    private startTime = 0;
    private frameReqId: number|undefined = undefined;
    private flipped = false;
    private walking = true;

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
        ctx.save();
        if (this.flipped) {
            ctx.scale(-1, 1);
            ctx.translate(-200, 0);
        }
        const eFrameNum = this.walking ? (Math.sin(frameNum / 20 * Math.PI) * 2.3 >> 0) : 0;
        ctx.translate(0, eFrameNum * 2);
        ctx.drawImage(gopherFrames[eFrameNum], 0, 0);
        ctx.restore();
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
});
