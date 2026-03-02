import { Telegraf, Markup, Context } from 'telegraf';
import { supabase } from '@/lib/supabase';

// Stateless Vercel-Compatible Bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

// HELPER: Show Main Menu
const showMainMenu = async (ctx: Context) => {
    await ctx.reply(
        '🌟 <b>MyFinanceuz Boshqaruvi</b>\n\n' +
        'O\'zingiz xohlagan summani yozib yuboring (Masalan: <code>50000</code>), yoki tezkor harakatni tanlang:',
        {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "🔴 Xarajat Qo'shish", callback_data: "add_expense" },
                        { text: "🟢 Daromad Qo'shish", callback_data: "add_income" }
                    ],
                    [
                        { text: "🏦 Kopilkaga tashlash", callback_data: "add_savings" }
                    ],
                    [
                        { text: "📊 Statistika", callback_data: "show_stats" },
                        { text: "🕒 Tarix", callback_data: "show_history" }
                    ]
                ]
            }
        }
    );
};

bot.start((ctx) => showMainMenu(ctx));
bot.help((ctx) => ctx.reply('Shunchaki kiritmoqchi bo\'lgan summangizni raqamda yozib yuboring (Masalan: 50000). Qolganini o\'zim so\'rayman! 😉'));

// ==========================================
// CALLBACK HANDLERS (Buttons)
// ==========================================

bot.action('add_savings', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('🏦 <b>Kopilkaga qancha pul tashlaymiz?</b>\n\n<i>Faqat raqam yozing:</i>', {
        parse_mode: 'HTML',
        reply_markup: { force_reply: true, selective: true }
    });
});

bot.action('add_expense', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('🔴 <b>Xarajat miqdorini yozing:</b>\n\n<i>Faqat raqam kiriting (masalan: 50000):</i>', {
        parse_mode: 'HTML',
        reply_markup: { force_reply: true, selective: true }
    });
});

bot.action('add_income', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('🟢 <b>Daromad miqdorini yozing:</b>\n\n<i>Faqat raqam kiriting (masalan: 1000000):</i>', {
        parse_mode: 'HTML',
        reply_markup: { force_reply: true, selective: true }
    });
});

// Category callback
bot.action(/cat_(expense|income)_(.+)_([0-9.]+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const type = ctx.match[1] as 'expense' | 'income';
    const catId = ctx.match[2];
    const amountStr = ctx.match[3];
    const amount = parseFloat(amountStr);

    // Fetch Category Name
    const { data: catData } = await supabase.from('categories').select('name').eq('id', catId).single();
    if (!catData) return ctx.editMessageText('❌ Kategoriya topilmadi.');

    await ctx.editMessageText(`✅ Kategoriya: <b>${catData.name}</b>\n\n📝 Endi qisqacha izoh yozing.\n<i>Izoh yozmasdan saqlash uchun /skip buyrug\'ini yuboring.</i>`, {
        parse_mode: 'HTML'
    });

    // We send a force reply for description
    await ctx.reply(`Izoh yozing (${type}, ${catId}, ${amount}):`, {
        reply_markup: { force_reply: true, selective: true }
    });
});

// Skip Description Button fallback directly saved
bot.action(/skip_desc_(expense|income)_(.+)_([0-9.]+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const type = ctx.match[1];
    const catId = ctx.match[2];
    const amountStr = ctx.match[3];
    const amount = parseFloat(amountStr);

    const finalAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
    await supabase.from('transactions').insert({ amount: finalAmount, type, category_id: catId, description: '' });

    const icon = type === 'income' ? '🟢 +' : '🔴 ';
    await ctx.editMessageText(`<blockquote>✅ <b>Saqlandi! (Izohsiz)</b></blockquote>\n${icon}${Math.abs(amount).toLocaleString('uz-UZ')} UZS`, { parse_mode: 'HTML' });
});

// Handle Casual selection typed amount
bot.action(/sel_type_(expense|income)_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const type = ctx.match[1] as 'expense' | 'income';
    const amountStr = ctx.match[2];

    const { data } = await supabase.from('categories').select('id, name').eq('type', type);
    const buttons = data?.map(c => [Markup.button.callback(c.name, `cat_${type}_${c.id}_${amountStr}`)]) || [];

    await ctx.editMessageText(`Siz <b>${parseFloat(amountStr).toLocaleString('uz-UZ')} UZS</b> kiritdingiz.\nQaysi kategoriyaga kiradi?`, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(buttons)
    });
});

bot.action(/sel_type_savings_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const amountStr = ctx.match[1];
    const amount = parseFloat(amountStr);

    let { data: catData } = await supabase.from('categories').select('*').eq('type', 'savings').ilike('name', 'Mening Jamg\'armam').single();
    if (!catData) {
        const { data } = await supabase.from('categories').insert({ name: 'Mening Jamg\'armam', type: 'savings', color: '#eab308' }).select().single();
        catData = data;
    }

    if (catData) {
        await supabase.from('transactions').insert({ amount: amount, type: 'savings', category_id: catData.id, description: 'Kopilkaga' });
        await ctx.editMessageText(`<blockquote>✅ <b>Saqlandi!</b></blockquote>\n🏦 <b>${amount.toLocaleString('uz-UZ')} UZS</b> Kopilkaga o'tkazildi! 🎉`, { parse_mode: 'HTML' });
    }
});


// ==========================================
// TEXT MESSAGE ROUTER (State logic via reply_to_message)
// ==========================================

bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (text.startsWith('/')) {
        if (text === '/skip' && ctx.message.reply_to_message) {
            // Handle skipping if replying to a description prompt manually
            return ctx.reply("Izoh o'tkazib yuborildi, ammo bu buyruq o'tgan holatni bekor qildi. /start dan kiring.");
        }
        return;
    }

    // 1. Is this a reply to a ForceReply prompt?
    if (ctx.message.reply_to_message && 'text' in ctx.message.reply_to_message) {
        const promptText = ctx.message.reply_to_message.text || '';

        // Match: Kopilka Amount
        if (promptText.includes('Kopilkaga qancha pul tashlaymiz?')) {
            const amount = parseFloat(text.replace(/[^0-9.]/g, ''));
            if (isNaN(amount)) return ctx.reply('❌ Iltimos faqat raqam kiriting.');

            let { data: catData } = await supabase.from('categories').select('*').eq('type', 'savings').ilike('name', 'Mening Jamg\'armam').single();
            if (!catData) {
                const { data } = await supabase.from('categories').insert({ name: 'Mening Jamg\'armam', type: 'savings', color: '#eab308' }).select().single();
                catData = data;
            }

            if (catData) {
                await supabase.from('transactions').insert({ amount: Math.abs(amount), type: 'savings', category_id: catData.id, description: 'Kopilkaga' });
                return ctx.reply(`<blockquote>✅ <b>Saqlandi!</b></blockquote>\n🏦 <b>${amount.toLocaleString('uz-UZ')} UZS</b> Kopilkaga muvaffaqiyatli o'tkazildi! 🎉`, { parse_mode: 'HTML' });
            }
            return ctx.reply('❌ Tizimda xatoli. Bazangiz to\'g\'ri sozlanganiga ishonch hosil qiling.');
        }

        // Match: Expense or Income Amount
        if (promptText.includes('Xarajat miqdorini yozing') || promptText.includes('Daromad miqdorini yozing')) {
            const amount = parseFloat(text.replace(/[^0-9.]/g, ''));
            if (isNaN(amount)) return ctx.reply('❌ Iltimos faqat raqam kiriting.');

            const type = promptText.includes('Xarajat') ? 'expense' : 'income';

            const { data } = await supabase.from('categories').select('id, name').eq('type', type);
            const buttons = data?.map(c => [Markup.button.callback(c.name, `cat_${type}_${c.id}_${amount}`)]) || [];

            return ctx.reply(`Siz <b>${amount.toLocaleString('uz-UZ')} UZS</b> kiritdingiz.\nQaysi kategoriyaga kiradi?`, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard(buttons)
            });
        }

        // Match: Description Input
        if (promptText.includes('Izoh yozing')) {
            // "Izoh yozing (expense, cat_id, amount)"
            const match = promptText.match(/\((expense|income),\s*([^,]+),\s*([0-9.]+)\)/);
            if (match) {
                const type = match[1];
                const catId = match[2];
                const amount = parseFloat(match[3]);
                const finalAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);

                await supabase.from('transactions').insert({ amount: finalAmount, type, category_id: catId, description: text === '-' ? '' : text });
                const icon = type === 'income' ? '🟢 +' : '🔴 ';
                return ctx.reply(`<blockquote>✅ <b>Saqlandi!</b></blockquote>\n${icon}${Math.abs(amount).toLocaleString('uz-UZ')} UZS\n<i>${text}</i>`, { parse_mode: 'HTML' });
            }
        }
    }

    // 2. Direct Casual Text (No Reply Context)
    const extractedNumberMatch = text.match(/([+-]?\$?\d+(?:\.\d+)?)/);
    if (extractedNumberMatch) {
        const amountStr = extractedNumberMatch[1].replace(/[^0-9.+-]/g, '');
        const amount = Math.abs(parseFloat(amountStr));

        if (!isNaN(amount)) {
            // Try pro parsing first (Number String)
            const proMatch = text.match(/^([+-]?\$?\d+(?:\.\d+)?)\s+(\w+)(?:\s+(?:-|—)\s+(.*))?$/i);
            if (proMatch) {
                const rawCat = proMatch[2];
                const desc = proMatch[3] || '';
                let { data: catData } = await supabase.from('categories').select('*').ilike('name', rawCat).maybeSingle();
                if (catData) {
                    const finalAmount = catData.type === 'expense' ? -amount : amount;
                    await supabase.from('transactions').insert({ amount: finalAmount, type: catData.type, category_id: catData.id, description: desc });
                    const icon = catData.type === 'income' ? '🟢 +' : catData.type === 'savings' ? '🏦 ' : '🔴 ';
                    return ctx.reply(`<blockquote>✅ <b>Tezkor Saqlandi!</b></blockquote>\n${icon}${amount.toLocaleString('uz-UZ')} UZS ➔ #${catData.name}\n<i>${desc}</i>`, { parse_mode: 'HTML' });
                }
            }

            // Casual routing UI
            return ctx.reply(
                `Siz <b>${amount.toLocaleString('uz-UZ')} UZS</b> kiritdingiz. Bu nima?`,
                {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('🔴 Xarajat', `sel_type_expense_${amount}`), Markup.button.callback('🟢 Kirim', `sel_type_income_${amount}`)],
                        [Markup.button.callback('🏦 Kopilkaga tashlash', `sel_type_savings_${amount}`)],
                        [Markup.button.callback('❌ Bekor qilish', 'cancel_action')]
                    ])
                }
            );
        }
    }

    ctx.reply('Tushunmadim 😕\nSiz kiritmoqchi bo\'lgan summani kiriting (masalan 50000) yoki /start buyrug\'ini yuboring.');
});

bot.action('cancel_action', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('❌ Bekor qilindi.');
});

// ==========================================
// 6. GLOBAL COMMANDS
// ==========================================

bot.action('show_stats', async (ctx) => {
    await ctx.answerCbQuery();
    try {
        const { data, error } = await supabase.from('transactions').select('amount, type');
        if (error) throw error;

        const income = data.filter(tx => tx.type === 'income').reduce((acc, tx) => acc + Number(tx.amount), 0);
        const expenses = Math.abs(data.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + Number(tx.amount), 0));
        const savings = data.filter(tx => tx.type === 'savings').reduce((acc, tx) => acc + Math.abs(Number(tx.amount)), 0);

        const total = income - expenses - savings;

        ctx.editMessageText(
            `<blockquote>📊 <b>Sizning Moliyaviy Holatingiz:</b></blockquote>\n\n` +
            `💰 <b>Hozirgi Balans:</b> ${total.toLocaleString('uz-UZ')} UZS\n\n` +
            `📈 <b>Jami Kirim:</b> 🟢 +${income.toLocaleString('uz-UZ')} UZS\n` +
            `📉 <b>Jami Chiqim:</b> 🔴 -${expenses.toLocaleString('uz-UZ')} UZS\n` +
            `🏦 <b>Jamg'arma (Kopilka):</b> 🟡 ${savings.toLocaleString('uz-UZ')} UZS\n\n` +
            `<i>Bugun, ${new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })} da yangilandi</i>`,
            { parse_mode: 'HTML' }
        );
    } catch (e: any) {
        if (e?.code === 'PGRST205') {
            return ctx.editMessageText('❌ Baza sozlanmagan! Avval SQL kodni ishlating.');
        }
        ctx.editMessageText('❌ Statistika yuklanmadi.');
    }
});

bot.action('show_history', async (ctx) => {
    await ctx.answerCbQuery();
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('*, categories(name, type)')
            .order('date', { ascending: false })
            .limit(5);

        if (error) throw error;
        if (!data || data.length === 0) return ctx.editMessageText('Sizda hali tranzaksiyalar yo\'q.');

        let msg = '<blockquote>🕒 <b>So\'nggi 5 ta amaliyot:</b></blockquote>\n\n';
        data.forEach(tx => {
            const catName = tx.categories?.name || 'Kategoriyasiz';
            const catType = tx.categories?.type || 'expense';

            const icon = catType === 'income' ? '🟢' : catType === 'savings' ? '🏦' : '🔴';
            const dateStr = new Date(tx.date).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            msg += `${icon} <b>${Math.abs(tx.amount).toLocaleString('uz-UZ')}</b> • #${catName} • <i>${dateStr}</i>\n`;
            if (tx.description) msg += `   └ <i>${tx.description}</i>\n\n`;
        });

        ctx.editMessageText(msg, { parse_mode: 'HTML' });
    } catch (e) {
        ctx.editMessageText('❌ Tarixni olishda xatolik yuz berdi. Baza sozlanganligini tekshiring.');
    }
});

export { bot };
