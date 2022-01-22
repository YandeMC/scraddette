import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";

export default class SuggestionBuilder {
	CHANNEL_ID = "";

	/** @param {string} CHANNEL_ID */
	constructor(CHANNEL_ID) {
		this.CHANNEL_ID = CHANNEL_ID;
	}

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 * @param {{ title: string; description: string }} data
	 */
	async createMessage(interaction, data) {
		const author = await interaction.guild?.members.fetch(interaction.user).catch(() => {});

		const embed = new MessageEmbed()
			.setColor(0x222222)
			.setAuthor({
				name: "Suggestion by " + author?.displayName || interaction.user.username,
				iconURL:
					author?.displayAvatarURL() ||
					interaction.user.displayAvatarURL() ||
					interaction.user.defaultAvatarURL ||
					"",
			})
			.setTitle(data.title)
			.setDescription(data.description);

		const channel = await interaction.guild?.channels.fetch(this.CHANNEL_ID);
		if (!channel?.isText()) throw new Error("Suggestion channel not found");
		const message = await channel.send({ embeds: [embed] });
		const thread = await message.startThread({
			name: "Unanswered | " + embed.title,
			autoArchiveDuration: "MAX",
			reason: "Suggestion/report by " + interaction.user.tag,
		});
		await thread.members.add(interaction.user.id);
		return { thread, message };
	}

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 * @param {string} answer
	 * @param {Record<string, import("discord.js").ColorResolvable>} colors
	 */
	async answerSuggestion(interaction, answer, colors) {
		if (!interaction.guild) {
			return interaction.reply({ content: "Command unavailable in DMs." });
		}
		if (!interaction.channel?.isThread() || interaction.channel.parentId !== this.CHANNEL_ID) {
			return interaction.reply({
				content: `This command can only be used in threads in <#${this.CHANNEL_ID}>.`,
				ephemeral: true,
			});
		}

		await Promise.all([
			interaction.channel.setName(
				interaction.channel.name.replace(/(.*) \|/i, answer + " |"),
				"Thread answered by " + interaction.user.tag,
			),

			await interaction.channel.fetchStarterMessage().then(async (message) => {
				const embed = new MessageEmbed(message.embeds[0]);
				embed.setColor(colors[answer] || 0x000);

				message.edit({ embeds: [embed] });
			}),
		]);
	}

	/** @param {import("discord.js").CommandInteraction} interaction */
	async deleteSuggestion(interaction) {
		if (!interaction.guild)
			return interaction.reply({ content: "This command is unavailable in DMs." });
		if (!interaction.channel?.isThread() || interaction.channel.parentId !== this.CHANNEL_ID)
			return interaction.reply({
				content: `This command can only be used in threads in <#${this.CHANNEL_ID}>.`,
				ephemeral: true,
			});

		const deleteButton = new MessageButton()
			.setLabel("Delete")
			.setCustomId("delete")
			.setStyle("DANGER");
		const cancelButton = new MessageButton()
			.setLabel("Cancel")
			.setCustomId("delete-cancel")
			.setStyle("SECONDARY");

		interaction.reply({
			content: `Are you really sure you want to do this?`,
			components: [new MessageActionRow().addComponents(deleteButton, cancelButton)],
			ephemeral: true,
		});

		const collector = interaction.channel.createMessageComponentCollector({
			filter: (i) =>
				["delete", "delete-cancel"].includes(i.customId) &&
				i.user.id === interaction.user.id,
			time: 15000,
		});

		collector.on("collect", async (i) => {
			switch (i.customId) {
				case "delete-cancel": {
					if (
						!interaction.channel?.isThread() ||
						interaction.channel.parentId !== this.CHANNEL_ID
					)
						return i.reply({
							content: `This command can only be used in threads in <#${this.CHANNEL_ID}>.`,
							ephemeral: true,
						});
					interaction.channel.delete();
					const m = await interaction.channel.fetchStarterMessage();
					m.delete();
					break;
				}
				case "delete": {
					deleteButton.setDisabled(true);
					cancelButton.setDisabled(true);
					i.reply({
						content: ":negative_squared_cross_mark: Deletion canceled.",
						ephemeral: true,
					});
					break;
				}
			}
		});

		collector.on("end", (collected) => {
			if (collected.size !== 0) return;
			deleteButton.setDisabled(true);
			cancelButton.setDisabled(true);
			interaction.editReply({
				content: ":negative_squared_cross_mark: Deletion timed out.",
				components: [new MessageActionRow().addComponents(deleteButton, cancelButton)],
			});
		});
	}

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 * @param {string} newSuggestion
	 *
	 * @returns {Promise<boolean>} - If true, you must repond to the interaction with a success
	 *   message yourself.
	 */
	async editSuggestion(interaction, newSuggestion) {
		if (!interaction.guild) {
			interaction.reply({ content: "The command is unavailable in DMs." });
			return false;
		}
		if (!interaction.channel?.isThread() || interaction.channel.parentId !== this.CHANNEL_ID) {
			interaction.reply({
				content: `This command can only be used in threads in <#${this.CHANNEL_ID}>.`,
				ephemeral: true,
			});
			return false;
		}
		const starterMessage = await interaction.channel.fetchStarterMessage();
		const embed = new MessageEmbed(starterMessage.embeds[0]);
		const initingMessages = await interaction.channel.messages.fetch({
			limit: 2,
			after: starterMessage.id,
		});
		const user = initingMessages.first()?.mentions.users.first();
		if (interaction.user.id !== user?.id) {
			interaction.reply({
				content: "You do not have permision to use this command.",
				ephemeral: true,
			});
			return false;
		}

		embed?.setDescription(newSuggestion);
		starterMessage.edit({ embeds: [embed] });
		return true;
	}
}
