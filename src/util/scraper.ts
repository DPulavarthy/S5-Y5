// Import dependencies.
import { Channel, TextChannel } from 'discord.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { launch, Page } from 'puppeteer';

interface ScraperData {
    status: number;
    url: string;
    ping: number;
    timestamp: number;
    data: ScraperDataSet[];
}

interface ScraperDataSet {
    title: string;
    url: string;
    pinned: boolean;
    timestamp: number;
    replies: number;
    views: number;
    author: {
        name: string;
        url: string;
    },
    updated: {
        user: {
            name: string;
            url: string;
        },
        timestamp: number;
    }
}

export default interface Scraper {
    exec: (resolve: Function, reject: Function) => void;
    page: Promise<Page>;
}

export default class Scraper {

    private static page: Page;

    private static website: {
        url: string;
        username: string;
        password: string;
    }

    private static data: {
        status: number;
        url: string;
        ping: number;
        timestamp: number;
        data: object[];
    }

    private static selectors = {
        login: {
            username: 'input#auth',
            password: 'input#password',
            submit: 'button#elSignIn_submit',
        },
        builder: {
            forum: (i: number) => `.ipsBox:nth-child(2) ol > li:nth-child(${i})`,
        },
        forum: {
            title: '.ipsDataItem_main a',
            timestamp: '.ipsDataItem_meta time',
            pinned: '.ipsDataItem_main .ipsBadge',
            replies: '.ipsDataItem_stats li:nth-child(1) span',
            views: '.ipsDataItem_stats li:nth-child(2) span',
            author: '.ipsDataItem_meta a',
            updated: {
                timestamp: '.ipsDataItem_lastPoster time',
                user: '.ipsDataItem_lastPoster li:nth-child(2) a',
            }
        }
    }

    static async fetch() {
        Scraper.website = await Scraper.read('login') as { url: string, username: string, password: string };
        Scraper.data = { status: 200, url: Scraper.website.url, ping: 0, timestamp: Date.now(), data: [] }
        return new Promise(Scraper.exec);
    }

    static async exec(resolve: Function, reject: Function): Promise<object> {
        try {
            let $: any = void 0;

            // Launch browser.
            const browser = await launch({ headless: !0, args: [`--window-size=1920,1080`], defaultViewport: { width: 1920, height: 1080 } });
            Scraper.page = await browser.newPage();

            await Scraper.page.goto(Scraper.website.url, { waitUntil: 'networkidle2' });

            await Scraper.get(Scraper.selectors.login.username);
            await Scraper.page.type(Scraper.selectors.login.username, Scraper.website.username);

            await Scraper.get(Scraper.selectors.login.password);
            await Scraper.page.type(Scraper.selectors.login.password, Scraper.website.password);

            await Scraper.get(Scraper.selectors.login.submit);
            await Scraper.page.click(Scraper.selectors.login.submit);

            await Scraper.page.waitForFunction('window.location.search.startsWith(\'?/forum/13-suggestions\')')

            for await (const i of Array(10).keys()) {
                $ = await Scraper.page.waitForSelector([Scraper.selectors.builder.forum(i + 1), Scraper.selectors.forum.title].join(' '), { timeout: 200 }).then(_ => !0).catch(_ => !1);
                if (!$) break;
                $ = await Scraper.get([Scraper.selectors.builder.forum(i + 1), Scraper.selectors.forum.title].join(' ')).catch(_ => !1);
                const title = await $.evaluate((e: { innerText: string }) => e.innerText);
                const url = await $.evaluate((e: { href: string }) => e.href);
                const pinned = await Scraper.page.waitForSelector([Scraper.selectors.builder.forum(i + 1), Scraper.selectors.forum.pinned].join(' '), { timeout: 200 }).then(_ => !0).catch(_ => !1);
                $ = await Scraper.get([Scraper.selectors.builder.forum(i + 1), Scraper.selectors.forum.timestamp].join(' '))
                const timestamp = await $.evaluate((e: { getAttribute(q: string): string }) => e.getAttribute('datetime')).then(Date.parse);
                $ = await Scraper.get([Scraper.selectors.builder.forum(i + 1), Scraper.selectors.forum.replies].join(' '))
                const replies = await $.evaluate((e: { innerText: string }) => e.innerText).then(parseInt);
                $ = await Scraper.get([Scraper.selectors.builder.forum(i + 1), Scraper.selectors.forum.views].join(' '))
                const views = await $.evaluate((e: { innerText: string }) => e.innerText).then(parseInt);
                $ = await Scraper.get([Scraper.selectors.builder.forum(i + 1), Scraper.selectors.forum.author].join(' '))
                const author = { name: await $.evaluate((e: { innerText: string }) => e.innerText), url: await $.evaluate((e: { href: string }) => e.href) }
                const updated = { timestamp: 0, user: { name: '', url: '' } }
                $ = await Scraper.get([Scraper.selectors.builder.forum(i + 1), Scraper.selectors.forum.updated.timestamp].join(' '))
                updated.timestamp = await $.evaluate((e: { getAttribute(q: string): string }) => e.getAttribute('datetime')).then(Date.parse);
                $ = await Scraper.get([Scraper.selectors.builder.forum(i + 1), Scraper.selectors.forum.updated.user].join(' '))
                updated.user.name = await $.evaluate((e: { innerText: string }) => e.innerText);
                updated.user.url = await $.evaluate((e: { href: string }) => e.href);
                Scraper.data.data.push({ title, url, pinned, timestamp, replies, views, author, updated });
            }

            await browser.close();
            Scraper.data.ping = Date.now() - Scraper.data.timestamp;
            Scraper.write('./cache/data.json', Scraper.data);
            return resolve(Scraper.data);
        } catch (error) { return reject(error) }
    }

    static async get(query: string) {
        return new Promise(async (resolve, reject) => {
            if (!Scraper.page) reject('No page found.');
            else {
                await Scraper.page.waitForSelector(query);
                await Scraper.page.$(query).then(resolve).catch(reject);
            }
        });
    }

    /** 
     * Get a JSON file and parse it. (With error handling).
     * 
     * @param {string} path The path to the JSON file.
     * @returns {object[]} The parsed JSON file.
     */
    private static async read(query: string): Promise<object> {
        return new Promise((resolve: Function) => {
            const exists = existsSync(`./cache/${query}.json`);
            resolve(exists ? JSON.parse(readFileSync(`./cache/${query}.json`, 'utf8')) : void 0)
        });
    }

    /**
     * Write an object to a JSON file.
     * 
     * @param {string} path The path to the JSON file.
     * @param {object[]} data The data to write to the JSON file.
     * @returns {void}
     */
    private static async write(path: string, data: object): Promise<void> {
        return new Promise((resolve: Function) => resolve(writeFileSync(path, JSON.stringify(data, null, 4), 'utf8')))
    }

    public static async check(): Promise<void> {
        const config: { managers: string[], channels: string[] } = await Scraper.read('config') as { managers: string[], channels: string[] };
        const data: ScraperData = await Scraper.read('data') as ScraperData || { status: 500, url: '', ping: 0, timestamp: 0, data: [] };
        const latest: ScraperDataSet | null = data.timestamp === 0 ? null : (data as { data: ({ timestamp: number, pinned: boolean })[] }).data.sort((a: { timestamp: number }, b: { timestamp: number }) => b.timestamp - a.timestamp).filter((set: { pinned: boolean }) => !set.pinned).shift() as ScraperDataSet;
        if (Date.now() - (latest?.timestamp ?? 0) > (1000 * 60 * 60)) await Scraper.fetch();
        const newData = await Scraper.read('data');
        const newLatest: ScraperDataSet = (newData as { data: ScraperDataSet[] }).data.sort((a: { timestamp: number }, b: { timestamp: number }) => b.timestamp - a.timestamp).filter((set: { pinned: boolean }) => !set.pinned).shift() as ScraperDataSet;
        if (latest?.timestamp !== newLatest?.timestamp) {
            for (const id of config.channels) {
                const channel: Channel = await client.channels.fetch(id, { force: !0, cache: !0 }) as Channel;
                (channel as TextChannel)?.send({
                    embeds: [{
                        ...embed,
                        title: 'Check this forum post out!',
                        description: `[${newLatest.title}](${newLatest.url}) by [${newLatest.author.name}](${newLatest.author.url}) - <t:${(newLatest.timestamp / 1000).toFixed(0)}:R>.`,
                    }]
                });
            }
        }
    }
}