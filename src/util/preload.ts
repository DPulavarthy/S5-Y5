// Import dependencies.
import { config } from 'dotenv';
import { S5Y5, Command as Base } from '#manager';
import { ApplicationCommandOptionType, ChatInputCommandInteraction, ApplicationCommandOptionData } from 'discord.js';


declare global {

    // Declare a global client.
    var client: S5Y5;

    // Declare a global command base.
    var Command: typeof Base;

    // Declare a global alias for interaction type.
    interface Interaction extends ChatInputCommandInteraction { }

    // Default embed data.
    var embed: {
        color: number;
        timestamp: string;
        footer: {
            text: string;
            icon_url: string;
        };
    }

    // Globally access interaction options types.
    var Options: typeof ApplicationCommandOptionType;

    // Command file interface.
    interface Meta {
        title: string;
        about: string;
        group: string;
        lines: number;
        ephemeral: boolean;
        options: ApplicationCommandOptionData[];
        run(interaction: ChatInputCommandInteraction, resolve: Function, reject: Function): Promise<unknown>;
    }

    interface Array<T> {

        // Check if 'this' is an array AND has at least one element.
        exists: () => boolean;

        // Get a random element from 'this' array.
        random: () => T;
    }

    interface Object {

        // Merge multiple objects into 'this'.
        mergify: (...subs: object[]) => object;
    }

    interface String {

        // Compare 'this' to another string, case insensitive.
        is: (query: string) => boolean;

        // Convert 'this' to camel case.
        camelify: () => string;

        // Parse 'this' into an object.
        parse: () => object;

        // Convert 'this' to a Discord code block.
        codify: (lang?: string) => string;
    }

    interface Number {

        // Convert 'this' as MS time to readable time.
        timify: (short?: boolean) => string;
    }
}

export default class Preload {
    public constructor() {

        // Catch all errors from the process and handle properly.
        process.on('uncaughtException', (error: Error | ReferenceError) => {
            console.error(error.stack);
            process.exit(1);
        });

        /**
         * Check if 'this' is an array AND has at least one element.
         * 
         * @return boolean
         * 
         * @example
         * [].exists(): false;
         * [1].exists(): true;
         */
        Array.prototype.exists = function (): boolean {
            return Array.isArray(this) && this?.some((e: unknown) => e);
        };

        /**
         * Get a random element from 'this' array.
         * 
         * @return T
         * 
         * @example
         * [1, 2, 3].random(): 1;
         */
        Array.prototype.random = function (): unknown {
            return this[Math.floor(Math.random() * this.length)];
        };

        /**
         * Merge multiple objects into 'this'.
         * 
         * @param subs - The objects to merge into 'this'.
         * @return object
         * 
         * @example
         * { a: 1 }.mergify({ b: 2 }): { a: 1, b: 2 };
         * {}.mergify({ a: 1 }): { a: 1 };
         */
        Object.prototype.mergify = function (...subs: object[]): object {
            subs.map((o: object) => Object.keys(o).map((k: string) => (this as { [key: string]: string })[k] = (o as { [key: string]: string })[k]));
            return this;
        };

        /**
         * Compare 'this' to another string, case insensitive.
         * 
         * @return boolean
         * 
         * @example
         * 'hello'.is('hello'): true;
         * 'hello'.is('HELLO'): true;
         * 'hello'.is('world'): false;
         */
        String.prototype.is = function (query: string): boolean {
            return this.localeCompare(query, undefined, { sensitivity: 'accent' }) === 0;
        };

        /**
         * Convert 'this' to camel case.
         * 
         * @return string
         * 
         * @example
         * 'hello world'.camelify(): 'helloWorld';
         * 'hello_world'.camelify(): 'helloWorld';
         */
        String.prototype.camelify = function (): string {
            return this.replace(/(?:^\w|[A-Z]|\b\w)/g, (word: string, index: number) => index === 0 ? word.toLowerCase() : word.toUpperCase()).replace(/\s+/g, '');
        }

        /**
         * Convert 'this' to a Discord code block.
         * 
         * @return string
         * @example
         * 'hello world'.codify(): '```\nhello world\n```';
         * 'hello world'.codify('js'): '```js\nhello world\n```';
         */
        String.prototype.codify = function (lang?: string): string {
            return `\`\`\`${lang ?? ''}\n${this}\n\`\`\``;
        }

        /**
         * Parse 'this' into an object.
         * 
         * @return object
         * 
         * @example
         * '-hello world'.parse(): { hello: 'world' };
         * '-ts --query 17.3'.parse(): { ts: true, query: 17.3 };
         */
        String.prototype.parse = function (): object {
            const args: { [key: string]: string | boolean | number } = {};
            let split: RegExpMatchArray | null = `${this} -`.match(/(-{1,})(.*?)(?=\s)(.*?)(?=\s-)/g);
            split?.map((p: string) => {
                const key: string = p.split(' ').shift()?.replace(/^-{1,}/g, '') || '';
                let value: string | boolean | number = p.split(' ').slice(1).join(' ').trim() || true;
                if (!isNaN(parseFloat(value as string))) value = parseFloat(value as string);
                args[key] = value;
            })
            return args;
        };

        /**
         * Convert 'this' as MS time to readable time.
         * 
         * @return string
         *
         * @example
         * 1000.timify(): '1 second';
         * 1000.timify(true): '1sec'; 
         * (1000 * 60 * 60 * 2).timify(true): '2hrs';
         * ((1000 * 60 * 60 * 2) + 3000).timify(): '2 hours and 3 seconds';
         */
        Number.prototype.timify = function (short?: boolean): string {
            let sec: number = +((this as number) / 1000).toFixed(0);
            let min: number = Math.floor(sec / 60);
            let hrs: number = min > 59 ? Math.floor(min / 60) : 0;
            min -= hrs * 60;
            sec = Math.floor(sec % 60);

            const result: string[] = [];
            hrs ? result.push(`${hrs.toLocaleString()} ${short ? 'hr' : 'hour'}${hrs === 1 ? '' : 's'}`) : void 0;
            min ? result.push(`${min} ${short ? 'min' : 'minute'}${min === 1 ? '' : 's'}`) : void 0;
            sec ? result.push(`${(min || hrs) ? 'and ' : ''} ${sec} ${short ? 'sec' : 'second'}${sec === 1 ? '' : 's'}`.trim()) : void 0;

            return short ? (result[0] ?? '0 secs') : (result.exists() ? result.join(' ') : '0 seconds');
        };

        // Globally expose useful command aliases.
        global.mergify({
            Options: ApplicationCommandOptionType,
            Command: Base
        });
    }

    /**
     * Check if required environment variables are loaded.
     * 
     * @return void  
     * 
     * @example
     * new Preload().load();
     */
    public load(): void {

        // Throw an error if the environment variables are not loaded.
        if (config()?.error) throw new ReferenceError('Failed to load .env properties.')

        // Throw an error if the wanted environment variables are not loaded.
        if (this.properties.exists()) throw new ReferenceError(`Failed to find following .env properties: ${this.properties.join(', ')}`)
    }


    /**
     * Check for the wanted environment variables.
     * 
     * @return string[]
     */
    private get properties(): string[] {
        const missing: string[] = []
        for (let id of ['TOKEN']) if (!process.env[id]) missing.push(id)
        return missing
    }
}
