import { Telegraf, Context } from 'telegraf';
import { supabase } from '@/lib/supabase';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

// ==========================================
// HELPER: Styled Inline Keyboard
// ==========================================
const STYLE = {
    RED: 'danger',
    GREEN: 'success',
    BLUE: 'primary',
};

const styledBtn = (text: string, callback_data: string, style?: string): any => {
    const btn: any = { text, callback_data };
    if (style) btn.style = style;
    return btn;
};

// Parse amounts with shorthand: 50k = 50000, 1.5m = 1500000
function parseAmount(text: string): number | null {
    const match = text.match(/^([+-]?\d+(?:\.\d+)?)\s*(k|m|ming|mln)?$/i);
    if (!match) return null;
    let amount = parseFloat(match[1]);
    const suffix = (match[2] || '').toLowerCase();
    if (suffix === 'k' || suffix === 'ming') amount *= 1000;
    if (suffix === 'm' || suffix === 'mln') amount *= 1000000;
    return isNaN(amount) ? null : Math.abs(amount);
}

// ==========================================
// MAIN MENU
// ==========================================
const showMainMenu = async (ctx: Context) => {
    await ctx.reply(
        '🌟 <b>MyFinanceuz — Moliyaviy Boshqaruvchi</b>\n\n' +
        '💡 <i>Summani yozing (masalan: <code>50000</code> yoki <code>50k</code>) yoki tugmalardan tanlang:</i>',
        {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        styledBtn("🔴 Xarajat", "add_expense", STYLE.RED),
                        styledBtn("🟢 Daromad", "add_income", STYLE.GREEN)
                    ],
                    [
                        styledBtn("🏦 Kopilkaga Tashlash", "add_savings")
                    ],
                    [
                        styledBtn("💰 Balans", "show_stats"),
                        styledBtn("🕒 Tarix", "show_history")
                    ],
                    [
                        styledBtn("📈 Haftalik Hisobot", "weekly_report", STYLE.GREEN)
                    ]
                ]
            }
        }
    );
};

bot.start((ctx) => showMainMenu(ctx));

bot.command('menu', (ctx) => showMainMenu(ctx));

// /balans — instant balance check
bot.command('balans', async (ctx) => {
    try {
        const { data } = await supabase.from('transactions').select('amount, type');
        if (!data || data.length === 0) {
            return ctx.reply('📊 Hali tranzaksiyalar yo\'q. /start tugmasini bosib boshlang!');
        }

        const income = data.filter(tx => tx.type === 'income').reduce((acc, tx) => acc + Number(tx.amount), 0);
        const expenses = Math.abs(data.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + Number(tx.amount), 0));
        const savings = data.filter(tx => tx.type === 'savings').reduce((acc, tx) => acc + Math.abs(Number(tx.amount)), 0);
        const total = income - expenses - savings;

        await ctx.reply(
            `💰 <b>Balans:</b> ${total.toLocaleString('uz-UZ')} UZS\n` +
            `🟢 Kirim: +${income.toLocaleString('uz-UZ')}\n` +
            `🔴 Chiqim: -${expenses.toLocaleString('uz-UZ')}\n` +
            `🏦 Jamg'arma: ${savings.toLocaleString('uz-UZ')}`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [styledBtn("📊 Batafsil", "show_stats"), styledBtn("🏠 Menyu", "go_home")]
                    ]
                }
            }
        );
    } catch {
        ctx.reply('❌ Balansni olishda xatolik.');
    }
});

bot.help((ctx) => ctx.reply(
    '📖 <b>Yordam</b>\n\n' +
    '1️⃣ Raqam yozing → <code>50000</code> yoki <code>50k</code>\n' +
    '2️⃣ "50000 ovqat" yoki "50k ovqat tushlik" → tezkor saqlash\n' +
    '3️⃣ /balans → tez balans ko\'rish\n' +
    '4️⃣ /start → Bosh menyu\n\n' +
    '<i>Bot sizning shaxsiy moliyaviy yordamchingiz!</i>',
    { parse_mode: 'HTML' }
));

// ==========================================
// CALLBACK HANDLERS
// ==========================================

bot.action('add_savings', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('🏦 <b>Kopilkaga qancha pul tashlaymiz?</b>\n\n<i>Raqam yozing (masalan: 50000 yoki 50k):</i>', {
        parse_mode: 'HTML',
        reply_markup: { force_reply: true, selective: true }
    });
});

bot.action('add_expense', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('🔴 <b>Xarajat miqdorini yozing:</b>\n\n<i>Raqam kiriting (masalan: 50000 yoki 50k):</i>', {
        parse_mode: 'HTML',
        reply_markup: { force_reply: true, selective: true }
    });
});

bot.action('add_income', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('🟢 <b>Daromad miqdorini yozing:</b>\n\n<i>Raqam kiriting (masalan: 1000000 yoki 1m):</i>', {
        parse_mode: 'HTML',
        reply_markup: { force_reply: true, selective: true }
    });
});

// Category callback
bot.action(/cat_(expense|income)_(.+)_([0-9.]+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const type = ctx.match[1] as 'expense' | 'income';
    const catId = ctx.match[2];
    const amount = parseFloat(ctx.match[3]);

    const { data: catData } = await supabase.from('categories').select('name').eq('id', catId).single();
    if (!catData) return ctx.editMessageText('❌ Kategoriya topilmadi.');

    const finalAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
    const { error } = await supabase.from('transactions').insert({
        amount: finalAmount, type, category_id: catId, description: ''
    });

    if (error) return ctx.editMessageText('❌ Xatolik: ' + error.message);

    const icon = type === 'income' ? '🟢' : '🔴';
    const sign = type === 'income' ? '+' : '-';

    await ctx.editMessageText(
        `<blockquote>✅ <b>Saqlandi!</b></blockquote>\n\n` +
        `${icon} <b>${sign}${Math.abs(amount).toLocaleString('uz-UZ')} UZS</b>\n` +
        `📂 ${catData.name}\n` +
        `📅 ${new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [styledBtn("🏠 Bosh menyu", "go_home")]
                ]
            }
        }
    );
});

// Type selection for casually typed amounts
bot.action(/sel_type_(expense|income)_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const type = ctx.match[1] as 'expense' | 'income';
    const amountStr = ctx.match[2];
    const btnStyle = type === 'expense' ? STYLE.RED : STYLE.GREEN;

    const { data } = await supabase.from('categories').select('id, name').eq('type', type);
    const buttons = data?.map(c => [styledBtn(c.name, `cat_${type}_${c.id}_${amountStr}`, btnStyle)]) || [];

    await ctx.editMessageText(
        `<b>${parseFloat(amountStr).toLocaleString('uz-UZ')} UZS</b> — qaysi kategoriyaga?`,
        {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: buttons }
        }
    );
});

// Savings direct flow
bot.action(/sel_type_savings_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const amount = parseFloat(ctx.match[1]);

    let { data: catData } = await supabase.from('categories').select('*').eq('type', 'savings').ilike('name', 'Mening Jamg\'armam').single();
    if (!catData) {
        const { data } = await supabase.from('categories').insert({ name: 'Mening Jamg\'armam', type: 'savings', color: '#fbbf24' }).select().single();
        catData = data;
    }

    if (catData) {
        await supabase.from('transactions').insert({ amount, type: 'savings', category_id: catData.id, description: 'Kopilkaga' });
        await ctx.editMessageText(
            `<blockquote>✅ <b>Muvaffaqiyatli!</b></blockquote>\n\n` +
            `🏦 <b>${amount.toLocaleString('uz-UZ')} UZS</b> Kopilkaga o'tkazildi! 🎉\n` +
            `📅 ${new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' })}`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [styledBtn("🏠 Bosh menyu", "go_home")]
                    ]
                }
            }
        );
    }
});

bot.action('go_home', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    await showMainMenu(ctx);
});

bot.action('cancel_action', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('❌ Bekor qilindi.');
});

// ==========================================
// TEXT MESSAGE ROUTER
// ==========================================

bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (text.startsWith('/')) {
        if (text === '/menu') return showMainMenu(ctx);
        return;
    }

    // 1. Reply to ForceReply prompt
    if (ctx.message.reply_to_message && 'text' in ctx.message.reply_to_message) {
        const promptText = ctx.message.reply_to_message.text || '';

        // Kopilka
        if (promptText.includes('Kopilkaga qancha pul tashlaymiz?')) {
            const amount = parseAmount(text.replace(/[^0-9.kKmM]/g, ''));
            if (!amount) return ctx.reply('❌ Iltimos faqat raqam kiriting (masalan: 50000 yoki 50k).');

            let { data: catData } = await supabase.from('categories').select('*').eq('type', 'savings').ilike('name', 'Mening Jamg\'armam').single();
            if (!catData) {
                const { data } = await supabase.from('categories').insert({ name: 'Mening Jamg\'armam', type: 'savings', color: '#fbbf24' }).select().single();
                catData = data;
            }

            if (catData) {
                await supabase.from('transactions').insert({ amount: Math.abs(amount), type: 'savings', category_id: catData.id, description: 'Kopilkaga' });
                return ctx.reply(
                    `<blockquote>✅ <b>Saqlandi!</b></blockquote>\n🏦 <b>${amount.toLocaleString('uz-UZ')} UZS</b> Kopilkaga muvaffaqiyatli o'tkazildi! 🎉`,
                    {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [styledBtn("🏠 Bosh menyu", "go_home")]
                            ]
                        }
                    }
                );
            }
            return ctx.reply('❌ Tizimda xatolik.');
        }

        // Expense or Income
        if (promptText.includes('Xarajat miqdorini yozing') || promptText.includes('Daromad miqdorini yozing')) {
            const amount = parseAmount(text.replace(/[^0-9.kKmM]/g, ''));
            if (!amount) return ctx.reply('❌ Iltimos faqat raqam kiriting (masalan: 50000 yoki 50k).');

            const type = promptText.includes('Xarajat') ? 'expense' : 'income';
            const btnStyle = type === 'expense' ? STYLE.RED : STYLE.GREEN;

            const { data } = await supabase.from('categories').select('id, name').eq('type', type);
            const buttons = data?.map(c => [styledBtn(c.name, `cat_${type}_${c.id}_${amount}`, btnStyle)]) || [];

            return ctx.reply(
                `<b>${amount.toLocaleString('uz-UZ')} UZS</b> — qaysi kategoriyaga?`,
                {
                    parse_mode: 'HTML',
                    reply_markup: { inline_keyboard: buttons }
                }
            );
        }
    }

    // 2. Direct text parsing with shorthand support
    // Try to extract amount with optional k/m suffix
    const amountMatch = text.match(/^([+-]?\d+(?:\.\d+)?)\s*(k|m|ming|mln)?\s*(.*)?$/i);
    if (amountMatch) {
        let amountRaw = parseFloat(amountMatch[1]);
        const suffix = (amountMatch[2] || '').toLowerCase();
        if (suffix === 'k' || suffix === 'ming') amountRaw *= 1000;
        if (suffix === 'm' || suffix === 'mln') amountRaw *= 1000000;
        const amount = Math.abs(amountRaw);
        const restText = (amountMatch[3] || '').trim();

        if (!isNaN(amount) && amount > 0) {
            // Pro format: "50000 ovqat tushlik uchun" or "50k ovqat"
            if (restText) {
                // First word is category, rest is description
                const words = restText.split(/\s+/);
                const rawCat = words[0];
                const desc = words.slice(1).join(' ');

                let { data: catData } = await supabase.from('categories').select('*').ilike('name', rawCat).maybeSingle();
                if (catData) {
                    const finalAmount = catData.type === 'expense' ? -amount : amount;
                    await supabase.from('transactions').insert({ amount: finalAmount, type: catData.type, category_id: catData.id, description: desc });
                    const icon = catData.type === 'income' ? '🟢 +' : catData.type === 'savings' ? '🏦 ' : '🔴 -';
                    return ctx.reply(
                        `<blockquote>✅ <b>Tezkor Saqlandi!</b></blockquote>\n${icon}${amount.toLocaleString('uz-UZ')} UZS ➔ #${catData.name}${desc ? '\n📝 ' + desc : ''}`,
                        {
                            parse_mode: 'HTML',
                            reply_markup: {
                                inline_keyboard: [
                                    [styledBtn("🏠 Bosh menyu", "go_home")]
                                ]
                            }
                        }
                    );
                }
            }

            // Routing UI
            return ctx.reply(
                `<b>${amount.toLocaleString('uz-UZ')} UZS</b> — bu nima?`,
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                styledBtn('🔴 Xarajat', `sel_type_expense_${amount}`, STYLE.RED),
                                styledBtn('🟢 Kirim', `sel_type_income_${amount}`, STYLE.GREEN)
                            ],
                            [styledBtn('🏦 Kopilkaga', `sel_type_savings_${amount}`)],
                            [styledBtn('❌ Bekor qilish', 'cancel_action')]
                        ]
                    }
                }
            );
        }
    }

    ctx.reply(
        'Tushunmadim 😕\n\n' +
        '<b>Maslahat:</b>\n' +
        '• Raqam yozing: <code>50000</code> yoki <code>50k</code>\n' +
        '• Tezkor: <code>50000 ovqat tushlik</code>\n' +
        '• /balans — balans ko\'rish\n' +
        '• /start — bosh menyu',
        { parse_mode: 'HTML' }
    );
});

// ==========================================
// STATISTICS
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

        const maxVal = Math.max(income, expenses, savings) || 1;
        const barLen = 12;
        const incomeBar = '🟩'.repeat(Math.max(1, Math.round((income / maxVal) * barLen)));
        const expenseBar = '🟥'.repeat(Math.max(1, Math.round((expenses / maxVal) * barLen)));
        const savingsBar = '🟨'.repeat(Math.max(1, Math.round((savings / maxVal) * barLen)));

        const savingsRatio = income > 0 ? ((savings / income) * 100).toFixed(1) : '0';
        const savingsGoalBar = buildProgressBar(parseFloat(savingsRatio), 50);

        await ctx.editMessageText(
            `<blockquote>📊 <b>Moliyaviy Holatingiz</b></blockquote>\n\n` +
            `💰 <b>Balans:</b> ${total.toLocaleString('uz-UZ')} UZS\n\n` +
            `📈 <b>Kirim:</b> +${income.toLocaleString('uz-UZ')} UZS\n${incomeBar}\n\n` +
            `📉 <b>Chiqim:</b> -${expenses.toLocaleString('uz-UZ')} UZS\n${expenseBar}\n\n` +
            `🏦 <b>Jamg'arma:</b> ${savings.toLocaleString('uz-UZ')} UZS\n${savingsBar}\n\n` +
            `<blockquote>🎯 <b>Jamg'arma Maqsadi (50%):</b>\n${savingsGoalBar} ${savingsRatio}%</blockquote>\n\n` +
            `<i>📅 ${new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}</i>`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [styledBtn("🏠 Bosh menyu", "go_home")]
                    ]
                }
            }
        );
    } catch (e: any) {
        if (e?.code === 'PGRST205') {
            return ctx.editMessageText('❌ Baza sozlanmagan! Avval SQL kodni ishlating.');
        }
        ctx.editMessageText('❌ Statistika yuklanmadi.');
    }
});

// ==========================================
// WEEKLY REPORT
// ==========================================

bot.action('weekly_report', async (ctx) => {
    await ctx.answerCbQuery();
    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const { data, error } = await supabase
            .from('transactions')
            .select('amount, type, date, categories(name)')
            .gte('date', oneWeekAgo.toISOString())
            .order('date', { ascending: false });

        if (error) throw error;

        const weekIncome = data?.filter(tx => tx.type === 'income').reduce((acc, tx) => acc + Number(tx.amount), 0) || 0;
        const weekExpense = Math.abs(data?.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + Number(tx.amount), 0) || 0);
        const weekSavings = data?.filter(tx => tx.type === 'savings').reduce((acc, tx) => acc + Math.abs(Number(tx.amount)), 0) || 0;
        const weekNet = weekIncome - weekExpense - weekSavings;

        const expensesByCategory: Record<string, number> = {};
        data?.filter(tx => tx.type === 'expense').forEach(tx => {
            const catName = (tx.categories as any)?.name || 'Boshqa';
            expensesByCategory[catName] = (expensesByCategory[catName] || 0) + Math.abs(Number(tx.amount));
        });

        let categoryBreakdown = '';
        const sortedCats = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]);
        sortedCats.forEach(([name, amount]) => {
            const pct = weekExpense > 0 ? ((amount / weekExpense) * 100).toFixed(0) : '0';
            categoryBreakdown += `   • ${name}: ${amount.toLocaleString('uz-UZ')} UZS (${pct}%)\n`;
        });

        let advice = '';
        if (weekExpense > weekIncome * 0.8) {
            advice = '⚠️ <b>Ogohlantirish:</b> Xarajatlar 80%+ — tejashga harakat qiling.';
        } else if (weekSavings > weekIncome * 0.3) {
            advice = '🌟 <b>Ajoyib!</b> 30%+ jamg\'arma — davom eting!';
        } else {
            advice = '💡 <b>Maslahat:</b> Har bir kirimdan kamida 20% kopilkaga tashlang.';
        }

        await ctx.editMessageText(
            `<blockquote>📈 <b>Haftalik Hisobot</b></blockquote>\n\n` +
            `🟢 Kirim: +${weekIncome.toLocaleString('uz-UZ')} UZS\n` +
            `🔴 Chiqim: -${weekExpense.toLocaleString('uz-UZ')} UZS\n` +
            `🏦 Jamg'arma: ${weekSavings.toLocaleString('uz-UZ')} UZS\n` +
            `💰 Sof natija: <b>${weekNet.toLocaleString('uz-UZ')} UZS</b>\n\n` +
            (categoryBreakdown ? `<blockquote>📂 <b>Xarajat Taqsimoti:</b>\n${categoryBreakdown}</blockquote>\n` : '') +
            `${advice}\n\n` +
            `<i>📅 ${oneWeekAgo.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })} — ${new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' })}</i>`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            styledBtn("📊 Statistika", "show_stats"),
                            styledBtn("🏠 Bosh menyu", "go_home")
                        ]
                    ]
                }
            }
        );
    } catch {
        ctx.editMessageText('❌ Haftalik hisobotni olishda xatolik.');
    }
});

// ==========================================
// HISTORY
// ==========================================

bot.action('show_history', async (ctx) => {
    await ctx.answerCbQuery();
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('*, categories(name, type)')
            .order('date', { ascending: false })
            .limit(7);

        if (error) throw error;
        if (!data || data.length === 0) return ctx.editMessageText('Sizda hali tranzaksiyalar yo\'q.');

        let msg = '<blockquote>🕒 <b>So\'nggi 7 ta amaliyot:</b></blockquote>\n\n';
        data.forEach((tx, i) => {
            const catName = tx.categories?.name || 'Kategoriyasiz';
            const catType = tx.categories?.type || 'expense';
            const icon = catType === 'income' ? '🟢' : catType === 'savings' ? '🏦' : '🔴';
            const sign = catType === 'income' ? '+' : catType === 'savings' ? '' : '-';
            const dateStr = new Date(tx.date).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' });

            msg += `${i + 1}. ${icon} <b>${sign}${Math.abs(tx.amount).toLocaleString('uz-UZ')}</b> • ${catName} • <i>${dateStr}</i>\n`;
            if (tx.description) msg += `   └ <i>${tx.description}</i>\n`;
        });

        ctx.editMessageText(msg, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [styledBtn("🏠 Bosh menyu", "go_home")]
                ]
            }
        });
    } catch {
        ctx.editMessageText('❌ Tarixni olishda xatolik.');
    }
});

// ==========================================
// UTILITY
// ==========================================

function buildProgressBar(current: number, target: number): string {
    const pct = Math.min(current / target, 1);
    const filled = Math.round(pct * 10);
    const empty = 10 - filled;
    return '▓'.repeat(filled) + '░'.repeat(empty);
}

export { bot };
