const gopherFrames = [new Image, new Image, new Image];
for (const [i, f] of gopherFrames.entries()) {
    f.src = `out0${i + 1}.png`;
}

class GopherAnimator {
    frameNum = 0;
    frameReqId: number|undefined = undefined;

    private requestNextFrame = () => {
        this.frameReqId = requestAnimationFrame(this.draw);
    };

    start = () => {
        this.requestNextFrame();
    };

    stop = () => {
        if (typeof this.frameReqId !== 'undefined') {
            cancelAnimationFrame(this.frameReqId);
            this.frameReqId = undefined;
        }
    };

    draw = () => {
        this.requestNextFrame();

        const canvas = <HTMLCanvasElement>document.getElementById('canvas');
        const ctx = canvas.getContext('2d')!!;
        ctx.clearRect(0, 0, 200, 200);
        ctx.drawImage(gopherFrames[Math.sin(this.frameNum / 30 * Math.PI) * 2.3 >> 0], 0, 0);
        this.frameNum++;
        if (this.frameNum >= 30) {
            this.frameNum = 0;
        }
    };
}

addEventListener('load', () => {
    const animator = new GopherAnimator;
    animator.start();
});
