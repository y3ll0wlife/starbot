import { Client, Intents, Interaction, MessageEmbed, MessageReaction, PartialMessageReaction, TextChannel } from "discord.js";
import sqlite3 from "sqlite3";
import { get } from "./utils/database";
import emojiRegex from "emoji-regex";
import { config } from "dotenv";

config({ path: `${__dirname}/../src/.env` });

const db = new sqlite3.Database("./src/db.db");
//db.run("DROP TABLE IF EXISTS starboard");

db.serialize(() => {
	db.run(
		"CREATE TABLE if not exists starboard (id INTEGER PRIMARY KEY AUTOINCREMENT, guildId TEXT, channelId TEXT, amount INTEGER, customEmoji TEXT)",
	);
	console.log("[DATABASE] Database is up and running");
});

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });

client.on("messageReactionAdd", async (messageReaction: MessageReaction | PartialMessageReaction) => {
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

	if (alreadyExists) {
		alreadyExists.edit({
			content: `${settings.customEmoji} **${messageReaction.count}** in <#${messageReaction.message.channel.id}>`,
			embeds: [embed],
		});

		return;
	}

	starboardChannel.send({
		content: `${settings.customEmoji} **${messageReaction.count}** in <#${messageReaction.message.channel.id}>`,
		embeds: [embed],
	});
});

client.on("messageReactionRemove", async (messageReaction: MessageReaction | PartialMessageReaction) => {
	const settings: { channelId: string; customEmoji: string } = (await get(db, "SELECT channelId, customEmoji  FROM starboard WHERE guildId = ?", [
		messageReaction.message.guildId,
	])) as any;

	if (!settings) return;
	if (settings.customEmoji === null) settings.customEmoji = "⭐";
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

	if (alreadyExists) {
		if (messageReaction.count === 0) {
			alreadyExists.delete();
			return;
		}

		alreadyExists.edit({
			content: `${settings.customEmoji} **${messageReaction.count}** in <#${messageReaction.message.channel.id}>`,
			embeds: [embed],
		});

		return;
	}
});

client.on("interactionCreate", async (interaction: Interaction) => {
	if (!interaction.isCommand()) return;

	if (!interaction.memberPermissions?.has("ADMINISTRATOR"))
		return await interaction.reply({
			ephemeral: true,
			content: "This maze was not meant for you",
		});

	if (interaction.commandName === "setup") {
		if (await get(db, "SELECT id FROM starboard WHERE guildId = ?", [interaction.guildId]))
			return await interaction.reply({
				ephemeral: true,
				content: "Starboard already setup for this server. Use `/edit` to update the values.",
			});

		const channel = interaction.options.data[0];
		const amount = interaction.options.data[1];

		db.run("INSERT INTO starboard(guildId, channelId, amount, customEmoji) VALUES (?, ?, ?, ?)", [
			interaction.guildId,
			channel.value,
			amount.value,
			null,
		]);

		await interaction.reply({
			ephemeral: true,
			content: "Successfully configured starboard ⭐",
		});
	} else if (interaction.commandName === "edit") {
		for (const option of interaction.options.data) {
			if (option.name === "starboard") {
				db.run("UPDATE starboard SET channelId = ? WHERE guildId = ?", [option.value, interaction.guildId]);
			} else if (option.name === "amount") {
				db.run("UPDATE starboard SET amount = ? WHERE guildId = ?", [option.value, interaction.guildId]);
			} else if (option.name === "custom-star") {
				const isEmoji = emojiRegex().exec(option.value as string);
				const isCustomEmoji = /<(?:a)?:([a-zA-Z0-9_]{2,32}):(\d{17,})>/g.exec(option.value as string);

				if (isEmoji === null && isCustomEmoji === null)
					return await interaction.reply({
						ephemeral: true,
						content: "Invalid emoji. Please use a custom emoji or a unicode emoji.",
					});

				if (isCustomEmoji) {
					if (!interaction.guild!.emojis.cache.find(emoji => emoji.id === isCustomEmoji![2]))
						return await interaction.reply({
							ephemeral: true,
							content: "I am unable to interact with that emoji, most likely because its from another server.",
						});
				}
				db.run("UPDATE starboard SET customEmoji = ? WHERE guildId = ?", [option.value, interaction.guildId]);
			}
		}

		const settings: { channelId: string; amount: number; customEmoji: string } = (await get(
			db,
			"SELECT channelId, amount, customEmoji  FROM starboard WHERE guildId = ?",
			[interaction.guildId],
		)) as any;

		await interaction.reply({
			ephemeral: true,
			content: `Successfully the starboard settings, the new settings are Channel: <#${settings.channelId}>, Amount: **${settings.amount}**, Emoji: ${settings.customEmoji}`,
		});
	}
});

client.on("ready", () => {
	console.log(`[CLIENT] Logged in as ${client.user?.tag} (${client.user?.id})`);
});

client.login(process.env.TOKEN);
