import { Telegraf, Markup } from 'telegraf';
import { supabase } from '@/lib/supabase';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

bot.start((ctx) => {
    ctx.reply(
        '🌟 <b>MyFinanceuz Botga Xush Kelibsiz!</b>\n\n' +
        '<blockquote>Men sizning shaxsiy moliyaviy yordamchingizman. Xarajat, daromad va jamg\'armangizni oson kuzatib boring.</blockquote>\n\n' +
        '<b>Buyruqlar:</b>\n' +
        '🔹 /yordam - Foydalanish bo\'yicha qo\'llanma\n' +
        '🔹 /stat - Joriy balansingiz va statistika\n' +
        '🔹 /tarix - So\'nggi tranzaksiyalar\n\n' +
        '<b>Tranzaksiya qo\'shish uchun menyuni bosing:</b>',
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔴 Xarajat qo\'shish', 'add_expense')],
                [Markup.button.callback('🟢 Daromad qo\'shish', 'add_income')],
                [Markup.button.callback('🟡 Jamg\'armaga o\'tkazish', 'add_savings')]
            ])
        }
    );
});

bot.help((ctx) => {
    ctx.reply(
        '🤖 <b>MyFinance qanday ishlatiladi:</b>\n\n' +
        '<blockquote><b>1. Tezkor Qo\'shish (Knopkalar orqali):</b></blockquote>\n' +
        'Shunchaki /start buyrug\'ini bering va menyudan tanlang.\n\n' +
        '<blockquote><b>2. Matn orqali qo\'shish:</b>\nMiqdor, kategoriya va izohni yozing.</blockquote>\n' +
        '   <code>25000 Oziq-ovqat - Non va sut</code>\n' +
        '   <code>+1500000 Oylik - Dekabr uchun</code>\n' +
        '   <code>$50000 Jamg\'arma</code>\n\n' +
        '<b>Asosiy buyruqlar:</b>\n' +
        '   /stat - Umumiy hisobot\n' +
        '   /tarix - Oxirgi 5 ta amaliyot',
        { parse_mode: 'HTML' }
    );
});

// Interactive Inline Keyboard Callbacks
bot.action('add_expense', async (ctx) => {
    // Fetch expense categories
    const { data } = await supabase.from('categories').select('name').eq('type', 'expense');
    const buttons = data?.map(c => [Markup.button.callback(c.name, `cat_expense_${c.name}`)]) || [];

    ctx.editMessageText('🔴 Xarajat kategoriyasini tanlang:',
        Markup.inlineKeyboard(buttons)
    );
});

bot.action('add_income', async (ctx) => {
    const { data } = await supabase.from('categories').select('name').eq('type', 'income');
    const buttons = data?.map(c => [Markup.button.callback(c.name, `cat_income_${c.name}`)]) || [];
    ctx.editMessageText('🟢 Daromad turini tanlang:', Markup.inlineKeyboard(buttons));
});

bot.action('add_savings', async (ctx) => {
    const { data } = await supabase.from('categories').select('name').eq('type', 'savings');
    const buttons = data?.map(c => [Markup.button.callback(c.name, `cat_savings_${c.name}`)]) || [];
    ctx.editMessageText('🟡 Jamg\'arma maqsadini tanlang:', Markup.inlineKeyboard(buttons));
});

// Handle Category Selection
bot.action(/cat_(expense|income|savings)_(.+)/, (ctx) => {
    const type = ctx.match[1];
    const catName = ctx.match[2];

    const promptText = type === 'income' ? '🟢 Daromad' : type === 'expense' ? '🔴 Xarajat' : '🟡 Jamg\'arma';

    ctx.reply(`Siz <b>#${catName}</b> (${promptText}) ni tanladingiz.\n\nEndi miqdorni yozib yuboring:\n<i>Masalan: 50000</i>`, { parse_mode: 'HTML' });
});

bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return;

    try {
        const regex = /^([+-]?\$?\d+(?:\.\d+)?)\s+(\w+)(?:\s+(?:-|—)\s+(.*))?$/i;
        const match = text.match(regex);

        if (match) {
            let amountStr = match[1].replace('$', '');
            const rawCategory = match[2];
            const description = match[3] || '';

            // Map standard text correctly if typing fast
            let isIncome = amountStr.startsWith('+');
            const isSavings = amountStr.startsWith('$') || rawCategory.toLowerCase().startsWith('jam');

            let type = isSavings ? 'savings' : (isIncome ? 'income' : 'expense');
            const amount = Math.abs(parseFloat(amountStr)) * (type === 'expense' ? -1 : 1);

            let { data: catData } = await supabase
                .from('categories')
                .select('*')
                .ilike('name', rawCategory)
                .single();

            if (!catData) {
                // Determine color
                let color = '#3b82f6';
                if (type === 'expense') color = '#ef4444';
                if (type === 'income') color = '#10b981';
                if (type === 'savings') color = '#eab308';

                const { data: newCat } = await supabase
                    .from('categories')
                    .insert({ name: rawCategory, type, color })
                    .select()
                    .single();
                catData = newCat;
            }

            if (!catData) return ctx.reply('❌ Kategoriya topilmadi. Qaytadan urinib ko\'ring.');

            const { error } = await supabase
                .from('transactions')
                .insert({
                    amount: amount,
                    type: catData.type, // Map directly to category type
                    category_id: catData.id,
                    description: description
                });

            if (error) throw error;

            const icon = catData.type === 'income' ? '🟢 +' : catData.type === 'savings' ? '🟡 ' : '🔴 ';
            ctx.reply(`<blockquote>✅ <b>Saqlandi!</b></blockquote>\n${icon}${Math.abs(amount).toLocaleString('uz-UZ')} UZS ➔ #${catData.name}\n<i>${description}</i>`, { parse_mode: 'HTML' });
        } else {
            // Intelligent fallback for just typing a number (assuming previous cat selection)
            const justNumberMatch = text.match(/^([+-]?\d+(?:\.\d+)?)$/);
            if (justNumberMatch) {
                ctx.reply(`Siz faqat miqdor yozdingiz. Iltimos, yoniga nimaga sarflaganingizni ko'rsating:\n\n<code>${text} Oziq-ovqat</code>`, { parse_mode: 'HTML' });
            } else {
                ctx.reply('<blockquote>Tushunmadim 😕</blockquote>\nFormat:\n<code>50000 Oziq-ovqat</code>\nYoki /start ni bosib menyudan foydalaning.', { parse_mode: 'HTML' });
            }
        }
    } catch (err) {
        console.error('Bot Error:', err);
        ctx.reply('❌ Tizimda xatolik yuz berdi. Iltimos keyinroq urinib koring.');
    }
});

bot.command('stat', async (ctx) => {
    try {
        const { data, error } = await supabase.from('transactions').select('amount, type');
        if (error) throw error;

        const income = data.filter(tx => tx.type === 'income').reduce((acc, tx) => acc + Number(tx.amount), 0);
        const expenses = Math.abs(data.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + Number(tx.amount), 0));
        const savings = data.filter(tx => tx.type === 'savings').reduce((acc, tx) => acc + Math.abs(Number(tx.amount)), 0);

        // Effective balance is Income - Expenses - Savings (money taken out of main account to put in savings)
        const total = income - expenses - savings;

        ctx.reply(
            `<blockquote>📊 <b>Sizning Moliyaviy Holatingiz:</b></blockquote>\n\n` +
            `💰 <b>Hozirgi Balans:</b> ${total.toLocaleString('uz-UZ')} UZS\n\n` +
            `📈 <b>Jami Kirim:</b> <tg-emoji emoji-id="5368324170671202286">🟢</tg-emoji> +${income.toLocaleString('uz-UZ')} UZS\n` +
            `📉 <b>Jami Chiqim:</b> <tg-emoji emoji-id="5368324170671202286">🔴</tg-emoji> -${expenses.toLocaleString('uz-UZ')} UZS\n` +
            `🏦 <b>Jamg'arma (Alohida):</b> <tg-emoji emoji-id="5368324170671202286">🟡</tg-emoji> ${savings.toLocaleString('uz-UZ')} UZS\n\n` +
            `<i><tg-date date="${Math.floor(Date.now() / 1000)}">Bugun, {time}</tg-date> da yangilandi</i>`,
            { parse_mode: 'HTML' }
        );
    } catch (e) {
        ctx.reply('❌ Statistika yuklanmadi.');
    }
});

bot.command('tarix', async (ctx) => {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('*, categories(name, type)')
            .order('date', { ascending: false })
            .limit(5);

        if (error) throw error;
        if (!data || data.length === 0) return ctx.reply('Sizda hali tranzaksiyalar yo\'q.');

        let msg = '<blockquote>🕒 <b>So\'nggi 5 ta amaliyot:</b></blockquote>\n\n';
        data.forEach(tx => {
            const catName = tx.categories?.name || 'Kategoriyasiz';
            const catType = tx.categories?.type || 'expense';

            const icon = catType === 'income' ? '🟢' : catType === 'savings' ? '🟡' : '🔴';
            const unixDate = Math.floor(new Date(tx.date).getTime() / 1000);

            msg += `${icon} <b>${Math.abs(tx.amount).toLocaleString('uz-UZ')}</b> • #${catName} • <i><tg-date date="${unixDate}">{time}</tg-date></i>\n`;
            if (tx.description) msg += `   └ <i>${tx.description}</i>\n\n`;
        });

        ctx.reply(msg, { parse_mode: 'HTML' });
    } catch (e) {
        ctx.reply('❌ Tarixni olishda xatolik.');
    }
});

export { bot };
