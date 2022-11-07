import { ApplicationCommandOptionType } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";
import Database from "../common/database.js";
import { defineCommand } from "../common/types/command.js";

export const userSettingsDatabase = new Database("user_settings");
await userSettingsDatabase.init();

const command = defineCommand({
	data: {
		description: "Customize personal settings",
		options: {
			"board-pings": {
				type: ApplicationCommandOptionType.Boolean,
				description: `Whether to ping you when your messages get on #${CONSTANTS.channels.board?.name}`,
			},
			"level-up-pings": {
				type: ApplicationCommandOptionType.Boolean,
				description: "Whether to ping you when you level up",
			},
			"weekly-pings": {
				type: ApplicationCommandOptionType.Boolean,
				description:
					"Whether to ping you if you are one of the most active people each week",
			},
			"autoreactions": {
				type: ApplicationCommandOptionType.Boolean,
				description: "Whether to automatically react to your messages with funny emojis",
			},
		},
	},
	async interaction(interaction) {
		const settingsForUser = userSettingsDatabase.data.find(
			({ user }) => user === interaction.user.id,
		);
		const boardPings =
				interaction.options.getBoolean("board-pings") ??
				settingsForUser?.boardPings ??
				process.env.NODE_ENV === "production",
			levelUpPings =
				interaction.options.getBoolean("level-up-pings") ??
				settingsForUser?.levelUpPings ??
				process.env.NODE_ENV === "production",
			weeklyPings =
				interaction.options.getBoolean("weekly-pings") ??
				settingsForUser?.weeklyPings ??
				process.env.NODE_ENV === "production",
			autoreactions =
				interaction.options.getBoolean("autoreactions") ??
				settingsForUser?.autoreactions ??
				true;
		userSettingsDatabase.data = settingsForUser
			? userSettingsDatabase.data.map((data) =>
					data.user === interaction.user.id
						? { user: data.user, boardPings, levelUpPings, weeklyPings, autoreactions }
						: data,
			  )
			: [
					...userSettingsDatabase.data,
					{
						user: interaction.user.id,
						boardPings,
						levelUpPings,
						weeklyPings,
						autoreactions,
					},
			  ];
		await interaction.reply({
			ephemeral: true,
			content:
				`${CONSTANTS.emojis.statuses.yes} Updated your settings!\n\n` +
				`Board Pings: ${CONSTANTS.emojis.statuses[boardPings ? "yes" : "no"]}\n` +
				`Level Up Pings: ${CONSTANTS.emojis.statuses[levelUpPings ? "yes" : "no"]}\n` +
				`Weekly Winner Pings: ${CONSTANTS.emojis.statuses[weeklyPings ? "yes" : "no"]}\n` +
				`Autoreactions: ${CONSTANTS.emojis.statuses[autoreactions ? "yes" : "no"]}`,
		});
	},
});
export default command;
