require('dotenv').config({ path: '.env.local' });
const token = process.env.TELEGRAM_BOT_TOKEN;
const vercelUrl = 'https://my-finances-coral.vercel.app/api/bot';

async function setup() {
    // First check current webhook info
    const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const info = await infoRes.json();
    console.log('Current webhook info:', JSON.stringify(info.result, null, 2));

    // Set webhook to Vercel
    const setRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${vercelUrl}`);
    const setData = await setRes.json();
    console.log('\nSet webhook result:', JSON.stringify(setData, null, 2));
}

setup();
