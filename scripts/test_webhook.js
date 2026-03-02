require('dotenv').config({ path: '.env.local' });
const token = process.env.TELEGRAM_BOT_TOKEN;

// Simulate a /start command payload
const testUpdate = {
    update_id: 999999999,
    message: {
        message_id: 1,
        from: { id: 123456, is_bot: false, first_name: 'Test' },
        chat: { id: 123456, first_name: 'Test', type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: '/start',
        entities: [{ offset: 0, length: 6, type: 'bot_command' }]
    }
};

async function test() {
    console.log('Testing POST to webhook...');
    const res = await fetch('https://my-finances-coral.vercel.app/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUpdate)
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
}

test();
