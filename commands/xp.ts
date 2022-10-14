import { ApplicationCommandOptionType } from "discord.js";

import CONSTANTS from "../common/CONSTANTS.js";
import { getLevelForXp, getXpForLevel, xpDatabase as database } from "../common/xp.js";
import { paginate } from "../util/discord.js";
import { makeProgressBar } from "../util/numbers.js";
import type { ChatInputCommand } from "../common/types/command";

const command: ChatInputCommand = {
	data: {
		description: "Commands to view users’ XP amounts",
		options: [
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "rank",
				description: "View a users’ XP rank",
				options: [
					{
						type: ApplicationCommandOptionType.User,
						name: "user",
						description: "User to view (defaults to you)",
					},
				],
			},
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "top",
				description: "View the users with the most XP in the server",
			},
		],
	},

	async interaction(interaction) {
		const command = interaction.options.getSubcommand(true);

		const allXp = database.data;
		const top = allXp.sort((one, two) => two.xp - one.xp);

		switch (command) {
			case "rank": {
				const user = interaction.options.getUser("user") || interaction.user;

				const member = await CONSTANTS.guild.members.fetch(user.id).catch(() => {});

				const xp = allXp.find((entry) => entry.user === user.id)?.xp || 0;
				const level = getLevelForXp(xp);
				const xpForNextLevel = getXpForLevel(level + 1);
				const xpForPreviousLevel = getXpForLevel(level);
				const increment = xpForNextLevel - xpForPreviousLevel;
				const xpGained = xp - xpForPreviousLevel;
				const progress = xpGained / increment;
				const rank = top.findIndex((info) => info.user === user.id) + 1;
				interaction.reply({
					embeds: [
						{
							color: member?.displayColor,
							author: {
								icon_url: (member || user).displayAvatarURL(),
								name: member?.displayName ?? user.username,
							},
							title: "XP Rank",
							fields: [
								{ name: "📊 Level", value: level.toLocaleString(), inline: true },
								{ name: "✨ XP", value: xp.toLocaleString(), inline: true },
								{
									name: CONSTANTS.zeroWidthSpace,
									value: CONSTANTS.zeroWidthSpace,
									inline: true,
								},
								{
									name: "⬆ Next Level XP",
									value: xpForNextLevel.toLocaleString(),
									inline: true,
								},
								{
									name: `${CONSTANTS.emojis.misc.percent} Progress`,
									value:
										progress.toLocaleString([], {
											maximumFractionDigits: 2,
											style: "percent",
										}) + ` (${xpGained}/${increment})`,
									inline: true,
								},
								{
									name: CONSTANTS.zeroWidthSpace,
									value: CONSTANTS.zeroWidthSpace,
									inline: true,
								},
								{
									value: CONSTANTS.zeroWidthSpace,
									name: makeProgressBar(progress),
								},
							],

							footer: {
								text:
									(rank
										? `Ranked ${
												rank.toLocaleString() +
												"/" +
												top.length.toLocaleString()
										  }${CONSTANTS.footerSeperator}`
										: "") + `View the leaderboard with /xp top`,
							},
						},
					],
				});
				return;
			}
			case "top": {
				await paginate(
					top,
					(xp) => {
						return `**Level ${getLevelForXp(xp.xp)}** - <@${
							xp.user
						}> (${xp.xp.toLocaleString()} XP)`;
					},
					"No users found.",
					`Leaderboard for ${CONSTANTS.guild.name}`,
					(data) => interaction[interaction.replied ? "editReply" : "reply"](data),
				);
			}
		}
	},
};
export default command;