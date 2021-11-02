# Starbot

A Discord bot that posts the starred messages ⭐

## Selfhosting slash commands
### Required slash commands
```json
{
	"name": "setup",
	"description": "Setup command to get started",
	"options": [
        {
			"type": 7,
			"name": "starboard",
			"description": "Channel where the messages that are starred will be posted",
			"required": true
		},
		{
			"type": 4,
			"name": "amount",
			"description": "Amount of stars needed for the bot to post to the starboard",
			"required": true
		}
	]
}
```

```json
{
  "name": "edit",
  "description": "Update the values of the starboard (only input the values you want to change)",
  "options": [
    {
      "type": 4,
      "name": "amount",
      "description": "Amount of stars needed for the bot to post to the starboard"
    },
    {
      "type": 7,
      "name": "starboard",
      "description": "Channel where the messages that are starred will be posted"
    },
    {
      "type": 3,
      "name": "custom-star",
      "description": "Id/name of a custom emoji or the other emojis"
    }
  ]
}
```

```json
{
  "name": "invite",
  "description": "Create an invite for the bot"
}
```