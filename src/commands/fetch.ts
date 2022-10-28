import { existsSync, readFileSync } from 'fs';


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

export default class Fetch extends Command {

    /**
     * Get the command description.
     * 
     * @returns {string}
     */
    public static get about(): string {
        return 'Fetch forum post(s).';
    }

    /**
     * Get the command privacy.
     * 
     * @returns {boolean}
     */
    public static get ephemeral(): boolean {
        return false;
    }

    /**
     * Get the command options.
     * 
     * @returns {ChatInputApplicationCommandData[]}
     */
    public static get options(): object[] {
        return [
            {
                name: 'query', description: 'Find a post by title, URL, or author.', type: Options.Subcommand, options: [
                    { name: 'url', description: 'The URL of the post to find.', type: Options.String, required: false },
                    { name: 'author', description: 'The author of the posts to find.', type: Options.String, required: false },
                    { name: 'title', description: 'The title of the post to find.', type: Options.String, required: false },
                    { name: 'all', description: 'Get all posts.', type: Options.Boolean, required: false },
                ]
            },
        ];
    }

    /**
     * Execute the command logic.
     * 
     * @param {Interaction} interaction
     * @returns {Promise<void>}
     */
    public async run(interaction: Interaction, resolve: Function, reject: Function): Promise<void> {

        const data = JSON.parse(readFileSync('./cache/data.json', 'utf8'));

        // Get the query.
        const command = existsSync('./cache/data.json') ? interaction.options.getSubcommand(true) : null;
        const url = interaction.options.getString('url', false);
        const author = interaction.options.getString('author', false);
        const title = interaction.options.getString('title', false);
        const all = interaction.options.getBoolean('all', false);

        if (command) {
            if (url) {
                const post = data.data.find((post: ScraperDataSet) => post.url.is(url));
                if (!post) reject('No post with that URL was found.');
                else await interaction.editReply({
                    embeds: [{
                        ...embed,
                        title: post.title,
                        url: post.url,
                        description: [
                            `Created by [${post.author.name}](${post.author.url}) - <t:${(post.timestamp / 1000).toFixed(0)}:R>. ${post.timestamp !== post.updated.timestamp ? `Last updated by [${post.updated.user.name}](${post.updated.user.url}) - <t:${(post.updated.timestamp / 1000).toFixed(0)}:R>.` : ''}\n`,
                            `Replies: **${post.replies}** | Views: **${post.views}**${post.pinned ? ' | \uD83D\uDCCC Pinned' : ''}`,
                            `\n**Last fetched:** <t:${(data.timestamp / 1000).toFixed(0)}:R>`,
                        ].join('\n'),
                    }]
                });
            } else if (author) {
                const posts = data.data.filter((post: ScraperDataSet) => post.author.name.is(author));
                if (!posts.exists()) reject('No posts by that author were found.');
                else await interaction.editReply({
                    embeds: [{
                        ...embed,
                        title: `Posts by ${posts[0].author.name}`,
                        url: posts[0].author.url,
                        description: [
                            ...posts.map((post: ScraperDataSet) => `[${post.title}](${post.url}) - <t:${(post.timestamp / 1000).toFixed(0)}:R>`),
                            `\n**Last fetched:** <t:${(data.timestamp / 1000).toFixed(0)}:R>`,
                        ].join('\n'),
                    }]
                });
            } else if (title) {
                const post = data.data.find((post: ScraperDataSet) => post.title.toLowerCase().startsWith(title.toLowerCase()));
                if (!post) reject('No post with that title was found.');
                else await interaction.editReply({
                    embeds: [{
                        ...embed,
                        title: post.title,
                        url: post.url,
                        description: [
                            `Created by [${post.author.name}](${post.author.url}) - <t:${(post.timestamp / 1000).toFixed(0)}:R>. ${post.timestamp !== post.updated.timestamp ? `Last updated by [${post.updated.user.name}](${post.updated.user.url}) - <t:${(post.updated.timestamp / 1000).toFixed(0)}:R>.` : ''}\n`,
                            `Replies: **${post.replies}** | Views: **${post.views}**${post.pinned ? ' | \uD83D\uDCCC Pinned' : ''}`,
                            `\n**Last fetched:** <t:${(data.timestamp / 1000).toFixed(0)}:R>`,
                        ].join('\n'),
                    }]
                });
            } else if (all) {
                await interaction.editReply({
                    embeds: [{
                        ...embed,
                        title: 'All posts',
                        url: data.url,
                        description: [
                            ...data.data.map((post: ScraperDataSet) => `${post.pinned ? '\uD83D\uDCCC ' : ''}[${post.title}](${post.url}) by [${post.author.name}](${post.author.url}) - <t:${(post.timestamp / 1000).toFixed(0)}:R>`),
                            `\n**Last fetched:** <t:${(data.timestamp / 1000).toFixed(0)}:R>`,
                        ].join('\n'),
                    }]
                });
            } else await interaction.editReply({ content: 'No data has been cached yet.' });
        }
        resolve();
    }
}
