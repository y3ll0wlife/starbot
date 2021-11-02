import { Client, MessageActionRow, MessageButton, MessageEmbed, MessageReaction, PartialMessageReaction, TextChannel } from "discord.js";
import { Database } from "sqlite3";
import { get } from "./utils/database";

export async function messageReactionAdd(messageReaction: MessageReaction | PartialMessageReaction, client: Client, db: Database) {
	const settings: { channelId: string; amount: number; customEmoji: string } = (await get(
		db,
		"SELECT channelId, amount, customEmoji  FROM starboard WHERE guildId = ?",
		[messageReaction.message.guildId],
	)) as any;

	if (!settings) return;
	if (settings.customEmoji === null) settings.customEmoji = "⭐";
	if (messageReaction.count! < settings.amount) return;
	if (settings.customEmoji !== messageReaction.emoji.name) {
		if (settings.customEmoji !== `<:${messageReaction.emoji.name}:${messageReaction.emoji.id}>`) return;
	}

	const starboardChannel = (await client.channels.fetch(settings.channelId)) as TextChannel | undefined;
	if (!starboardChannel) return;

	const starboardPrevious = await starboardChannel.messages.fetch({ limit: 100 }); // @ts-ignore
	const alreadyExists = starboardPrevious.find(m => m.embeds[0]?.footer?.text === `${messageReaction.message.id}`);

	// @ts-ignore
	let image: string | undefined = messageReaction.message.attachments.find(a => a.name?.endsWith(".png") || a.name.endsWith(".jpg"))?.attachment;

	if (!image)
		image = messageReaction.message.content?.match(
			/((?:https?:\/\/)[a-z0-9]+(?:[-.][a-z0-9]+)*\.[a-z]{2,5}(?::[0-9]{1,5})?(?:\/[^ \n<>]*)\.(?:png|apng|jpg|gif))/g,
		)?.[0];

	const embed = new MessageEmbed()
		.setColor("GOLD")
		.setAuthor(messageReaction.message.author!.tag, messageReaction.message.author!.displayAvatarURL({ dynamic: true }))
		.setFooter(`${messageReaction.message.id}`)
		.setTimestamp();

	if (messageReaction.message.content) embed.setDescription(messageReaction.message.content);
	if (image) embed.setImage(image);

	const row = new MessageActionRow().addComponents(
		new MessageButton()
			.setURL(
				`https://stars.discord.com/channels/${messageReaction.message.guildId}/${messageReaction.message.channel.id}/${messageReaction.message.id}`,
			)
			.setLabel("Jump to Message")
			.setStyle("LINK"),
	);

	if (alreadyExists) {
		alreadyExists.edit({
			content: `${settings.customEmoji} **${messageReaction.count}** in <#${messageReaction.message.channel.id}>`,
			embeds: [embed],
			components: [row],
		});

		return;
	}

	starboardChannel.send({
		content: `${settings.customEmoji} **${messageReaction.count}** in <#${messageReaction.message.channel.id}>`,
		embeds: [embed],
		components: [row],
	});
}
