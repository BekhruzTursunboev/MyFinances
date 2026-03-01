const { Telegraf } = require('telegraf');
require('dotenv').config({ path: '.env.local' });

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

async function setWebhook() {
    // We need a public URL for Telegram webhooks. 
    // For local development, we'd normally use ngrok.
    // Since we don't have a live domain yet, we'll try to just start it in long-polling mode 
    // to verify the token works, or tell the developer how to set the webhook later.

    try {
        const me = await bot.telegram.getMe();
        console.log('Bot successfully connected:', me.username);
        console.log('To set a webhook for production, you will need a public HTTPS URL.')
        console.log('Run this in your browser: https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_TOKEN + '/setWebhook?url=https://YOUR_DOMAIN/api/bot');
    } catch (err) {
        console.error('Failed to get bot info:', err);
    }
}

setWebhook();
