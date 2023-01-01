const [express, cors, { createCanvas, loadImage, registerFont }] = ['express', 'cors', 'canvas'].map(require);
const port = 50000;

express()
    .use(cors())
    .get('/', (_, res) => res.status(200).json({ status: 200, message: 'Online.' }))
    .get('/image', async (req, res) => {
        const [url, time] = [req.query.url ?? req.query.u, req.query.time ?? req.query.t];
        if (!url || !time) return res.status(400).json({ status: 400, message: 'Missing parameters.' });
        registerFont('roboto.ttf', { family: 'Roboto Bold' })
        const thumbnail = await loadImage(url);
        const [ctx, height] = [createCanvas(thumbnail.width, thumbnail.height).getContext('2d'), +((thumbnail.height * 12) / 200).toFixed(0)];
        ctx.font = `${height}px "Roboto Bold"`;
        const width = ctx.measureText($(time)).width;
        ctx.drawImage(thumbnail, 0, 0, thumbnail.width, thumbnail.height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.beginPath();
        ctx.roundRect(thumbnail.width - 30 - width, thumbnail.height - 30 - height, width + 20, height + 20, 10);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.fillText($(time), thumbnail.width - 20 - width, thumbnail.height - 25);
        res.writeHead(200, { 'Content-Type': 'image/png' }).end(ctx.canvas.toBuffer('image/png'));
    })
    .listen(port, _ => console.log(`Listening on port ${port}`));

function $(raw) {
    const matches = new RegExp(/(?:P)(\d+D)?(?:T)(\d+H)?(\d+M)?(\d+S)/g).exec(raw).filter(t => t && t.match(/\b\d+\w{1}\b/g)).map(t => +t.slice(0, -1));
    return [
        matches.length > 2 ? `${matches.length === 4 ? ((matches[0] * 24) + matches[1]) : matches[0]}:` : '',
        matches.length > 2 ? `${matches[matches.length - 2] < 10 ? `0${matches[matches.length - 2]}` : matches[matches.length - 2]}:` : (matches.length === 2 ? `${matches[matches.length - 2]}:` : '0:'),
        matches[matches.length - 1] < 10 ? `0${matches[matches.length - 1]}` : matches[matches.length - 1]
    ].join('');
}