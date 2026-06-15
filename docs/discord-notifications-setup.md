# Discord Order Notifications — Operator Setup

One-time setup so new orders post to Discord with a confirm button.

1. Create a Discord application at https://discord.com/developers/applications.
2. Under **Bot**, add a bot and copy its **token**.
3. Invite the bot to your server with the **Send Messages** permission.
4. Copy these into Payload admin → Settings → Notification settings:
   - Bot token (step 2)
   - Channel ID (right-click the target channel → Copy Channel ID; requires Developer Mode)
   - Application public key (app → General Information → Public Key)
   - Allowed Discord user IDs (comma-separated; right-click a user → Copy User ID)
   - Tick **Enable Discord order notifications**.
5. In the app → General Information, set **Interactions Endpoint URL** to
   `https://<your-domain>/api/discord/interactions`. Discord sends a validation
   PING; the endpoint answers it automatically.
