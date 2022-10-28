import { existsSync, readFileSync, writeFileSync } from 'fs';

export default class Manage extends Command {

    /**
     * Get the command description.
     * 
     * @returns {string}
     */
    public static get about(): string {
        return 'Manage announcement channels.';
    }

    /**
     * Get the command privacy.
     * 
     * @returns {boolean}
     */
    public static get ephemeral(): boolean {
        return true;
    }

    /**
     * Get the command options.
     * 
     * @returns {ChatInputApplicationCommandData[]}
     */
    public static get options(): object[] {
        return [
            {
                name: 'add', description: 'Add new announcement channel or bot manager.', type: Options.Subcommand, options: [
                    { name: 'verify', description: 'YOU ARE UPDATING IMPORTANT INFORMATION, PLEASE VERIFY!', type: Options.Boolean, required: true },
                    { name: 'user', description: 'The user to add to the manager list.', type: Options.User, required: false },
                    { name: 'channel', description: 'The channel to add to the annoucement list.', type: Options.Channel, required: false },
                ]
            },
            {
                name: 'remove', description: 'Remove an announcement channel or bot manager.', type: Options.Subcommand, options: [
                    { name: 'verify', description: 'YOU ARE UPDATING IMPORTANT INFORMATION, PLEASE VERIFY!', type: Options.Boolean, required: true },
                    { name: 'user', description: 'The user to remove from the manager list.', type: Options.User, required: false },
                    { name: 'channel', description: 'The channel to remove from the annoucement list.', type: Options.Channel, required: false },
                ]
            },
            {
                name: 'list', description: 'List all announcement channels and bot managers.', type: Options.Subcommand
            }
        ];
    }

    /**
     * Execute the command logic.
     * 
     * @param {Interaction} interaction
     * @returns {Promise<void>}
     */
    public async run(interaction: Interaction, resolve: Function, reject: Function): Promise<void> {

        const data = JSON.parse(readFileSync('./cache/config.json', 'utf8'));

        // Get the query.
        const command = existsSync('./cache/config.json') ? interaction.options.getSubcommand(true) : null;

        switch (command) {
            case 'list': {
                if (!data.managers.includes(interaction.user.id)) return reject('You are not a bot manager.');
                await interaction.editReply({
                    embeds: [{
                        ...embed,
                        description: [
                            '**Announcement Channels**',
                            ...data.channels.map((channel: string) => `<#${channel}>`),
                            '\n**Bot Managers**',
                            ...data.managers.map((manager: string) => `<@${manager}>`),
                        ].join('\n'),
                    }]
                });
                break;
            }

            case 'add': {
                const user = interaction.options.getUser('user');
                const channel = interaction.options.getChannel('channel');
                const verify = interaction.options.getBoolean('verify');
                if (!data.managers.includes(interaction.user.id)) return reject('You are not a bot manager.');
                if (!user && !channel) return reject('You must provide a user or channel.');
                if (!verify) return reject('You must verify that you are updating important information.');
                if (user) {
                    if (data.managers.includes(user.id)) return reject('This user is already a manager.');
                    data.managers.push(user.id);
                    writeFileSync('./cache/config.json', JSON.stringify(data, null, 4), 'utf8')
                    await interaction.editReply({ embeds: [{ ...embed, title: 'Action: Add Manager | Status: Success', }] });
                    break
                }
                if (channel) {
                    if (data.channels.includes(channel.id)) return reject('This channel is already an announcement channel.');
                    data.channels.push(channel.id);
                    writeFileSync('./cache/config.json', JSON.stringify(data, null, 4), 'utf8')
                    await interaction.editReply({ embeds: [{ ...embed, title: 'Action: Add Channel | Status: Success', }] });
                }
                break
            }

            case 'remove': {
                const user = interaction.options.getUser('user');
                const channel = interaction.options.getChannel('channel');
                const verify = interaction.options.getBoolean('verify');
                if (!data.managers.includes(interaction.user.id)) return reject('You are not a bot manager.');
                if (!user && !channel) return reject('You must provide a user or channel.');
                if (!verify) return reject('You must verify that you are updating important information.');
                if (user) {
                    if (user.id === interaction.user.id) return reject('You cannot remove yourself as a manager.');
                    if (!data.managers.includes(user.id)) return reject('This user is not a manager.');
                    data.managers.splice(data.managers.indexOf(user.id), 1);
                    writeFileSync('./cache/config.json', JSON.stringify(data, null, 4), 'utf8');
                    await interaction.editReply({ embeds: [{ ...embed, title: 'Action: Remove Manager | Status: Success', }] });
                }
                if (channel) {
                    if (!data.channels.includes(channel.id)) return reject('This channel is not an announcement channel.');
                    data.channels.splice(data.channels.indexOf(channel.id), 1);
                    writeFileSync('./cache/config.json', JSON.stringify(data, null, 4), 'utf8');
                    await interaction.editReply({ embeds: [{ ...embed, title: 'Action: Remove Channel | Status: Success', }] });
                }
                break
            }
        }
        resolve();
    }
}
