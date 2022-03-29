const gopherFrames = [new Image, new Image, new Image];
for (const [i, f] of gopherFrames.entries()) {
    f.src = `out0${i + 1}.png`;
}

class GopherAnimator {
    private frameNum = 0;
    private frameReqId: number|undefined = undefined;
    private flipped = false;
    private walking = true;

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

    setFlipped = (flipped: boolean) => {
        this.flipped = flipped;
    };

    setWalking = (walking: boolean) => {
        this.walking = walking;
    };

    draw = () => {
        this.requestNextFrame();

        const canvas = <HTMLCanvasElement>document.getElementById('canvas');
        const ctx = canvas.getContext('2d')!!;
        ctx.clearRect(0, 0, 200, 200);
        ctx.save();
        if (this.flipped) {
            ctx.scale(-1, 1);
            ctx.translate(-200, 0);
        }
        const eFrameNum = this.walking ? (Math.sin(this.frameNum / 30 * Math.PI) * 2.3 >> 0) : 0;
        ctx.drawImage(gopherFrames[eFrameNum], 0, 0);
        ctx.restore();
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
