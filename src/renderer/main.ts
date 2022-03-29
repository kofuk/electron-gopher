const gopherFrames = [new Image, new Image, new Image];
for (const [i, f] of gopherFrames.entries()) {
    f.src = `out0${i + 1}.png`;
}

addEventListener('load', () => {
    const canvas = <HTMLCanvasElement>document.getElementById('canvas')
    const ctx = canvas.getContext('2d')!!;
    console.log(gopherFrames[0]);
    ctx.drawImage(gopherFrames[0], 0, 0);
});
