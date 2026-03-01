// Wrapper script to run the exact Next.js Bot logic in pure Node.js local context (without webhooks)
require('dotenv').config({ path: '.env.local' });

// Overwrite process vars so `bot.ts` inside src/lib works natively
process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Using dynamic import to skip TS compilation locally since we already built it
const tsConfig = require('../tsconfig.json');
const tsConfigPaths = require('tsconfig-paths');

tsConfigPaths.register({
    baseUrl: './',
    paths: tsConfig.compilerOptions.paths
});

require('ts-node').register({
    transpileOnly: true,
    compilerOptions: { module: 'commonjs', moduleResolution: 'node' }
});

const { bot } = require('../src/lib/bot.ts');

bot.telegram.deleteWebhook().then(() => {
    console.log('Cleared any existing webhooks.');
    bot.launch().then(() => {
        console.log('✅ Uzbek V2 Bot started locally in long-polling mode!');
        console.log('You can now talk to @Mening_finansim_bexruz_bot on Telegram without needing Webhooks or Vercel!');
    }).catch(console.error);
}).catch(console.error);

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
