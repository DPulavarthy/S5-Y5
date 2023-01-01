import { parse } from 'node-html-parser';
import { launch } from 'puppeteer';
import { writeFileSync, existsSync, mkdirSync, rename, unlinkSync, readdirSync } from 'fs';
import { Transform as Stream } from 'stream';
import { request } from 'https';
// import meta from 'get-media-dimensions'
// import VideoCrop from 'video-crop'

let FOLDER = 'output';

// const Crop = VideoCrop.default;

Array.prototype.exists = function () {
    return Array.isArray(this) && this?.some(e => e);
};

String.prototype.parse = function () {
    const args = {};
    let split = `${this} -`.match(/(-{1,})(.*?)(?=\s)(.*?)(?=\s-)/g);
    split?.map(p => {
        const key = p.split(' ').shift()?.replace(/^-{1,}/g, '') || '';
        let value = p.split(' ').slice(1).join(' ').trim() || true;
        if (!isNaN(parseFloat(value))) value = parseFloat(value);
        args[key] = value;
    })
    return args;
};

function random(sections = 5, phrase = 5, join = '-') {
    const list = [...[...Array(26)].map((_, i) => String.fromCharCode(i + 65)), ...[...Array(26)].map((_, i) => String.fromCharCode(i + 65).toLowerCase()), ...[...Array(10).keys()]]
    const random = _ => list[Math.floor(Math.random() * list.length)]
    return [...Array(sections)].map(_ => [...Array(phrase)].map(random).join('')).join(join)
}

// flush();
const param = process.argv.slice(2).join(' ').parse()
let total = 1;
let downloaded = 0;

if (param.video) param.v = param.video;
if (param.user) param.u = param.user;

if ((param.v && typeof param.v !== 'string') || (param.u && typeof param.u !== 'string') || (!param.v && !param.u)) help();
else {
    if (param.v) download(param.v).then(log);
    if (param.u) fetch(param.u).then(download);
}

function help() {
    console.log([
        'Usage: node index.js [options]',
        '',
        'Options:',
        '  -v, --video <video>  Download video',
        '  -u, --user <user>    Download user',
        '  -h, --help           Display help for command'
    ].join('\n'))
}

function log(param) {
    console.log(typeof param === 'number' ? `Downloaded ${param}/${total}` : param);
}

// function flush() {
//     readdirSync('./pending').map(file => unlinkSync(`./pending/${file}`));
// }

async function download(video) {
    if (Array.isArray(video)) downloadLoop()
    else return actuallyDownload(video);

    async function downloadLoop() {
        if (!video.exists()) return process.exit(0);
        const success = await actuallyDownload(video[0]);
        log(success);
        video.shift()
        downloadLoop();
    }

    function actuallyDownload(link) {

        !existsSync(`./${FOLDER}`) ? mkdirSync(`./${FOLDER}`, { recursive: true }) : void 0

        return new Promise(async (resolve, reject) => {
            try {
                let url = null;
                const browser = await launch({ headless: !0 });
                const page = await browser.newPage();
                await page.goto('https://musicaldown.com/en', { waitUntil: 'networkidle2' });
                await page.type('input', link);
                await page.click('button[type=submit]');
                await page.waitForFunction("window.location.pathname == '/download'")
                await page.waitForSelector('a[target]');
                const raw = await page.content()
                await browser.close();
                const $ = parse(raw)
                $.querySelectorAll('a[target]').map(a => !a.attributes.href.match(/(https:\/\/)(muscdn\.xyz|v1\.musicaldown\.com)/g) && (url = a.attributes.href))
                request(url, video => {
                    const raw = new Stream();
                    // const path = `./pending/${random()}.mp4`;
                    const path = `./${FOLDER}/${random()}.mp4`;
                    video.on('data', data => raw.push(data));
                    video.on('end', async () => {
                        await writeFileSync(path, raw.read())
                        // await validate(path)
                        resolve(++downloaded)
                    })
                }).end();
            } catch (e) { reject(e) };
        })
    }
}

// function validate(path) {
//     return new Promise(async (resolve, reject) => {
//         const { width, height } = await meta(path, 'video')

//         if (width / height === 9 / 16) rename(path, `./${FOLDER}/${random()}.mp4`, e => e ? reject(e) : resolve())
//         else {
//             let newHeight = height;
//             let newWidth = (height * 9) / 16
//             if (newWidth > width) {
//                 newWidth = width
//                 newHeight = (width * 16) / 9
//             }

//             new Crop({
//                 input: path,
//                 output: `./${FOLDER}/${random()}.mp4`,
//                 x: (width / 2) - (newWidth / 2),
//                 y: 0,
//                 height: newHeight,
//                 width: newWidth,
//             }).run();

//             resolve()
//         }
//     })
// }

function fetch(user) {
    return new Promise(async (resolve, reject) => {
        const browser = await launch({ headless: !1 });
        const page = await browser.newPage();
        await page.goto(user, { waitUntil: 'networkidle2' });

        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let [currentHeight, previousHeight] = [0, 0];

                const autoScroller = setInterval(function () {
                    window.scrollTo(0, document.body.scrollHeight);
                    currentHeight = document.body.scrollHeight;

                    if (currentHeight === previousHeight) {
                        clearInterval(autoScroller);
                        resolve()
                    } else previousHeight = currentHeight;
                }, 1000);
            });
        });

        let list = await page.evaluate(() => {
            return Promise.resolve(Array.from(document.querySelectorAll('.tiktok-yz6ijl-DivWrapper a')).map(video => video.href));
        });

        await browser.close();
        total = list.length;
        resolve(list)
    })
}