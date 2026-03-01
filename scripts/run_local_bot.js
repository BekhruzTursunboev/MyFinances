const { bot } = require('../src/lib/bot-local.js'); // We'll create a CommonJS equivalent for running purely in node

// Workaround to run the bot outside of Next.js for local development
require('dotenv').config({ path: '.env.local' });
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const localBot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

localBot.start((ctx) => {
    ctx.reply(
        '🌟 <b>Welcome to MyFinance Bot!</b>\n\n' +
        '<blockquote>I help you track your expenses and income easily, keeping your finances under control.</blockquote>\n\n' +
        '<b>Commands:</b>\n' +
        '🔹 /help - Show this help message\n' +
        '🔹 /stats - View your current balance\n' +
        '🔹 /recent - View recent transactions\n\n' +
        '<b>To add a transaction, simply type:</b>\n' +
        '<code>[Amount] [Category] - [Description]</code>\n' +
        '<i>Example: 50 Food - Lunch</i>',
        { parse_mode: 'HTML' }
    );
});

localBot.help((ctx) => {
    ctx.reply(
        '🤖 <b>How to use MyFinance Bot:</b>\n\n' +
        '<blockquote><b>1. Add Expense:</b> Send a number followed by category.</blockquote>\n' +
        '   <code>25 Food</code>\n' +
        '   <code>120 Utilities - Electric bill</code>\n\n' +
        '<blockquote><b>2. Add Income:</b> Use + sign.</blockquote>\n' +
        '   <code>+1500 Income - Salary</code>\n\n' +
        '<b>Commands:</b>\n' +
        '   /stats - Get total balance\n' +
        '   /recent - Get latest 5 transactions',
        { parse_mode: 'HTML' }
    );
});

localBot.on('text', async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return;

    try {
        const regex = /^([+-]?\d+(?:\.\d+)?)\s+(\w+)(?:\s+(?:-|—)\s+(.*))?$/i;
        const match = text.match(regex);

        if (match) {
            const amountStr = match[1];
            const rawCategory = match[2];
            const description = match[3] || '';

            const isIncome = amountStr.startsWith('+') || rawCategory.toLowerCase() === 'income';
            const amount = Math.abs(parseFloat(amountStr)) * (isIncome ? 1 : -1);
            const type = isIncome ? 'income' : 'expense';

            let { data: catData } = await supabase
                .from('categories')
                .select('*')
                .ilike('name', rawCategory)
                .single();

            if (!catData) {
                const { data: newCat } = await supabase
                    .from('categories')
                    .insert({ name: rawCategory, type, color: isIncome ? '#10b981' : '#ef4444' })
                    .select()
                    .single();
                catData = newCat;
            }

            if (!catData) return ctx.reply('❌ Error setting up category. Please try again.');

            const { error } = await supabase
                .from('transactions')
                .insert({
                    amount: amount,
                    type: type,
                    category_id: catData.id,
                    description: description
                });

            if (error) throw error;

            ctx.reply(`<blockquote>✅ <b>Transaction Added successfully!</b></blockquote>\n${amount > 0 ? '🟢 +' : '🔴 '}$${amount.toFixed(2)} for #${catData.name}\n<i>${description}</i>`, { parse_mode: 'HTML' });
        } else {
            ctx.reply('<blockquote>I didn\'t understand that format. 😕</blockquote>\nTry: <code>50 Food - Lunch</code>\nor send /help for more info.', { parse_mode: 'HTML' });
        }
    } catch (err) {
        console.error('Bot Error:', err);
        ctx.reply('❌ Sorry, an error occurred while saving your transaction.');
    }
});

localBot.command('stats', async (ctx) => {
    try {
        const { data, error } = await supabase.from('transactions').select('amount');
        if (error) throw error;

        const total = data.reduce((acc, tx) => acc + Number(tx.amount), 0);
        const income = data.filter(tx => tx.amount > 0).reduce((acc, tx) => acc + Number(tx.amount), 0);
        const expenses = Math.abs(data.filter(tx => tx.amount < 0).reduce((acc, tx) => acc + Number(tx.amount), 0));

        ctx.reply(
            `<blockquote>📊 <b>Your Financial Stats:</b></blockquote>\n\n` +
            `💰 <b>Total Balance:</b> $${total.toFixed(2)}\n` +
            `📈 <b>Income:</b> <tg-emoji emoji-id="5368324170671202286">🟢</tg-emoji> +$${income.toFixed(2)}\n` +
            `📉 <b>Expenses:</b> <tg-emoji emoji-id="5368324170671202286">🔴</tg-emoji> -$${expenses.toFixed(2)}\n\n` +
            `<i><tg-date date="${Math.floor(Date.now() / 1000)}">Today at {time}</tg-date></i>`,
            { parse_mode: 'HTML' }
        );
    } catch (e) {
        ctx.reply('❌ Could not fetch stats.');
    }
});

localBot.command('recent', async (ctx) => {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('*, categories(name)')
            .order('date', { ascending: false })
            .limit(5);

        if (error) throw error;
        if (!data || data.length === 0) return ctx.reply('No recent transactions found.');

        let msg = '<blockquote>🕒 <b>Recent Transactions:</b></blockquote>\n\n';
        data.forEach(tx => {
            const catName = tx.categories?.name || 'Unknown';
            const icon = tx.amount > 0 ? '🟢' : '🔴';
            const unixDate = Math.floor(new Date(tx.date).getTime() / 1000);
            msg += `${icon} <b>$${tx.amount.toFixed(2)}</b> • #${catName} • <i><tg-date date="${unixDate}">{time}</tg-date></i>\n`;
            if (tx.description) msg += `   └ <i>${tx.description}</i>\n\n`;
        });

        ctx.reply(msg, { parse_mode: 'HTML' });
    } catch (e) {
        ctx.reply('❌ Could not fetch recent transactions.');
    }
});

// Start bot in long-polling mode
localBot.telegram.deleteWebhook().then(() => {
    console.log('Cleared any existing webhooks.');
    localBot.launch().then(() => {
        console.log('✅ Bot started locally in long-polling mode!');
        console.log('You can now talk to @Mening_finansim_bexruz_bot on Telegram without needing Webhooks or Vercel!');
    }).catch(console.error);
}).catch(console.error);

// Enable graceful stop
process.once('SIGINT', () => localBot.stop('SIGINT'));
process.once('SIGTERM', () => localBot.stop('SIGTERM'));
