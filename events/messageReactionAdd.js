/** @file Update Potatoboard when reactions are added. */
import dotenv from "dotenv";

import {
	BOARD_CHANNEL,
	BOARD_EMOJI,
	sourceToBoardMessage,
	postMessageToBoard,
	MIN_REACTIONS,
	updateReactionCount,
} from "../common/board.js";
import { SUGGESTION_EMOJIS } from "../common/suggest.js";

dotenv.config();

/**
 * Determine if a message should be posted to #potatoboard or update it if it is already there.
 *
 * @param {import("discord.js").MessageReaction} reaction - The added reaction.
 * @param {import("discord.js").User} user - The user who reacted.
 */
export default async function reactionAdd(reaction, user) {
	if (reaction.partial) reaction = await reaction.fetch();

	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

	if (user.partial) user = await user.fetch();

	if (
		reaction.message.channel.id === process.env.SUGGESTION_CHANNEL &&
		user.id !== user.client.user?.id
	) {
		const otherReaction = SUGGESTION_EMOJIS.find((emojis) =>
			emojis.includes(reaction.emoji.id || reaction.emoji.name || ""),
		)?.find((emoji) => emoji !== (reaction.emoji.id || reaction.emoji.name || ""));
		if (otherReaction)
			return await reaction.message.reactions.resolve(otherReaction)?.users.remove(user);
	}

	if (
		// Ignore other servers
		message.guild?.id !== process.env.GUILD_ID ||
		// Ignore when it's the wrong emoji
		reaction.emoji.name !== BOARD_EMOJI ||
		// Ignore when it's me
		user.id === message.client.user?.id
	)
		return;

	if (
		// if a bot reacted
		(user.bot && user.id !== message.client.user?.id) ||
		// Or if they self-reacted
		(user.id === message.author.id && process.env.NODE_ENV === "production") ||
		// Or if they reacted to a message on the board
		(message.channel.id === BOARD_CHANNEL && message.author.id === message.client.user?.id) ||
		// Or they reacted to an /explorepotatoes message
		(message.interaction?.commandName === "explorepotatoes" && message.embeds.length > 0)
	) {
		// Remove the reaction
		await reaction.users.remove(user);

		return;
	}

	const boardMessage = await sourceToBoardMessage(message);

	const fetched = message.reactions.resolve(BOARD_EMOJI);
	const count = (fetched?.count || 0) - (fetched?.me ? 1 : 0);

	if (boardMessage?.embeds[0]) {
		await updateReactionCount(count, boardMessage);
	} else {
		if (count < MIN_REACTIONS) return;

		await postMessageToBoard(message);
	}
}
