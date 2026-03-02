import { Telegraf, Markup, Context } from 'telegraf';
import { supabase } from '@/lib/supabase';

// Stateless Vercel-Compatible Bot — API 9.4 Enhanced
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

// ==========================================
// HELPER: Colored Inline Keyboard (API 9.4)
// ==========================================
// Telegraf's types don't support `color` yet, so we use raw objects
// color format is 0xRRGGBB integer

const COLOR = {
    RED: 0xE5484D,   // Expense red
    GREEN: 0x2EAB5B,   // Income green
    GOLD: 0xF5A623,   // Savings gold
    BLUE: 0x3B82F6,   // Info blue
    GRAY: 0x333333,   // Neutral dark
    PURPLE: 0x8B5CF6,   // Entertainment purple
};

// Helper to build a colored inline button (raw API 9.4 payload)
const colorBtn = (text: string, callback_data: string, color?: number): any => {
    const btn: any = { text, callback_data };
    if (color !== undefined) btn.color = color;
    return btn;
};

// ==========================================
// MAIN MENU with Colored Buttons
// ==========================================
const showMainMenu = async (ctx: Context) => {
    await ctx.reply(
        '🌟 <b>MyFinanceuz — Moliyaviy Boshqaruvchi</b>\n\n' +
        '💡 <i>Summani yozing (masalan: <code>50000</code>) yoki tugmalardan birini tanlang:</i>',
        {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        colorBtn("🔴 Xarajat", "add_expense", COLOR.RED),
                        colorBtn("🟢 Daromad", "add_income", COLOR.GREEN)
                    ],
                    [
                        colorBtn("🏦 Kopilkaga Tashlash", "add_savings", COLOR.GOLD)
                    ],
                    [
                        colorBtn("📊 Statistika", "show_stats", COLOR.BLUE),
                        colorBtn("🕒 Tarix", "show_history", COLOR.GRAY)
                    ],
                    [
                        colorBtn("📈 Haftalik Hisobot", "weekly_report", COLOR.PURPLE)
                    ]
                ]
            }
        }
    );
};

bot.start((ctx) => showMainMenu(ctx));
bot.help((ctx) => ctx.reply(
    '📖 <b>Yordam</b>\n\n' +
    '1️⃣ Shunchaki raqam yozing → summa kiritiladi\n' +
    '2️⃣ "50000 ovqat" → tezkor saqlash\n' +
    '3️⃣ Tugmalarni bosing → menyular\n' +
    '4️⃣ /start → Bosh menyu\n\n' +
    '<i>Bot sizning shaxsiy moliyaviy yordamchingiz!</i>',
    { parse_mode: 'HTML' }
));

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

// Category callback with colored buttons
bot.action(/cat_(expense|income)_(.+)_([0-9.]+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const type = ctx.match[1] as 'expense' | 'income';
    const catId = ctx.match[2];
    const amountStr = ctx.match[3];
    const amount = parseFloat(amountStr);

    const { data: catData } = await supabase.from('categories').select('name').eq('id', catId).single();
    if (!catData) return ctx.editMessageText('❌ Kategoriya topilmadi.');

    // Save directly with no description prompt for speed
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
        `📂 Kategoriya: <b>${catData.name}</b>\n` +
        `📅 ${new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [colorBtn("🏠 Bosh menyu", "go_home", COLOR.BLUE)]
                ]
            }
        }
    );
});

// Handle type selection for casual-typed amount — with colored category buttons
bot.action(/sel_type_(expense|income)_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const type = ctx.match[1] as 'expense' | 'income';
    const amountStr = ctx.match[2];
    const btnColor = type === 'expense' ? COLOR.RED : COLOR.GREEN;

    const { data } = await supabase.from('categories').select('id, name').eq('type', type);
    const buttons = data?.map(c => [colorBtn(c.name, `cat_${type}_${c.id}_${amountStr}`, btnColor)]) || [];

    await ctx.editMessageText(
        `Siz <b>${parseFloat(amountStr).toLocaleString('uz-UZ')} UZS</b> kiritdingiz.\n` +
        `Qaysi kategoriyaga kiradi?`,
        {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: buttons }
        }
    );
});

// Savings direct flow
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
        await ctx.editMessageText(
            `<blockquote>✅ <b>Muvaffaqiyatli!</b></blockquote>\n\n` +
            `🏦 <b>${amount.toLocaleString('uz-UZ')} UZS</b> Kopilkaga o'tkazildi! 🎉\n` +
            `📅 ${new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' })}`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [colorBtn("🏠 Bosh menyu", "go_home", COLOR.BLUE)]
                    ]
                }
            }
        );
    }
});

// Go Home button
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
                return ctx.reply(
                    `<blockquote>✅ <b>Saqlandi!</b></blockquote>\n🏦 <b>${amount.toLocaleString('uz-UZ')} UZS</b> Kopilkaga muvaffaqiyatli o'tkazildi! 🎉`,
                    {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [colorBtn("🏠 Bosh menyu", "go_home", COLOR.BLUE)]
                            ]
                        }
                    }
                );
            }
            return ctx.reply('❌ Tizimda xatolik. Bazangiz to\'g\'ri sozlanganiga ishonch hosil qiling.');
        }

        // Match: Expense or Income Amount
        if (promptText.includes('Xarajat miqdorini yozing') || promptText.includes('Daromad miqdorini yozing')) {
            const amount = parseFloat(text.replace(/[^0-9.]/g, ''));
            if (isNaN(amount)) return ctx.reply('❌ Iltimos faqat raqam kiriting.');

            const type = promptText.includes('Xarajat') ? 'expense' : 'income';
            const btnColor = type === 'expense' ? COLOR.RED : COLOR.GREEN;

            const { data } = await supabase.from('categories').select('id, name').eq('type', type);
            const buttons = data?.map(c => [colorBtn(c.name, `cat_${type}_${c.id}_${amount}`, btnColor)]) || [];

            return ctx.reply(
                `Siz <b>${amount.toLocaleString('uz-UZ')} UZS</b> kiritdingiz.\nQaysi kategoriyaga kiradi?`,
                {
                    parse_mode: 'HTML',
                    reply_markup: { inline_keyboard: buttons }
                }
            );
        }
    }

    // 2. Direct Casual Text (No Reply Context)
    const extractedNumberMatch = text.match(/([+-]?\$?\d+(?:\.\d+)?)/);
    if (extractedNumberMatch) {
        const amountStr = extractedNumberMatch[1].replace(/[^0-9.+-]/g, '');
        const amount = Math.abs(parseFloat(amountStr));

        if (!isNaN(amount)) {
            // Try pro parsing "50000 ovqat"
            const proMatch = text.match(/^([+-]?\$?\d+(?:\.\d+)?)\s+(\w+)(?:\s+(?:-|—)\s+(.*))?$/i);
            if (proMatch) {
                const rawCat = proMatch[2];
                const desc = proMatch[3] || '';
                let { data: catData } = await supabase.from('categories').select('*').ilike('name', rawCat).maybeSingle();
                if (catData) {
                    const finalAmount = catData.type === 'expense' ? -amount : amount;
                    await supabase.from('transactions').insert({ amount: finalAmount, type: catData.type, category_id: catData.id, description: desc });
                    const icon = catData.type === 'income' ? '🟢 +' : catData.type === 'savings' ? '🏦 ' : '🔴 ';
                    return ctx.reply(
                        `<blockquote>✅ <b>Tezkor Saqlandi!</b></blockquote>\n${icon}${amount.toLocaleString('uz-UZ')} UZS ➔ #${catData.name}\n<i>${desc}</i>`,
                        {
                            parse_mode: 'HTML',
                            reply_markup: {
                                inline_keyboard: [
                                    [colorBtn("🏠 Bosh menyu", "go_home", COLOR.BLUE)]
                                ]
                            }
                        }
                    );
                }
            }

            // Casual routing UI with colored buttons
            return ctx.reply(
                `Siz <b>${amount.toLocaleString('uz-UZ')} UZS</b> kiritdingiz. Bu nima?`,
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                colorBtn('🔴 Xarajat', `sel_type_expense_${amount}`, COLOR.RED),
                                colorBtn('🟢 Kirim', `sel_type_income_${amount}`, COLOR.GREEN)
                            ],
                            [colorBtn('🏦 Kopilkaga', `sel_type_savings_${amount}`, COLOR.GOLD)],
                            [colorBtn('❌ Bekor qilish', 'cancel_action', COLOR.GRAY)]
                        ]
                    }
                }
            );
        }
    }

    ctx.reply('Tushunmadim 😕\nSiz kiritmoqchi bo\'lgan summani kiriting (masalan 50000) yoki /start buyrug\'ini yuboring.');
});

// ==========================================
// STATISTICS with Visual Bar Chart
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

        // Build visual bar chart
        const maxVal = Math.max(income, expenses, savings) || 1;
        const barLen = 12;
        const incomeBar = '🟩'.repeat(Math.max(1, Math.round((income / maxVal) * barLen)));
        const expenseBar = '🟥'.repeat(Math.max(1, Math.round((expenses / maxVal) * barLen)));
        const savingsBar = '🟨'.repeat(Math.max(1, Math.round((savings / maxVal) * barLen)));

        // Savings goal progress (50% savings ratio as target)
        const savingsRatio = income > 0 ? ((savings / income) * 100).toFixed(1) : '0';
        const savingsGoalBar = buildProgressBar(parseFloat(savingsRatio as string), 50); // 50% goal

        await ctx.editMessageText(
            `<blockquote>📊 <b>Moliyaviy Holatingiz</b></blockquote>\n\n` +
            `💰 <b>Hozirgi Balans:</b> ${total.toLocaleString('uz-UZ')} UZS\n\n` +
            `📈 <b>Kirim:</b> +${income.toLocaleString('uz-UZ')} UZS\n${incomeBar}\n\n` +
            `📉 <b>Chiqim:</b> -${expenses.toLocaleString('uz-UZ')} UZS\n${expenseBar}\n\n` +
            `🏦 <b>Jamg'arma:</b> ${savings.toLocaleString('uz-UZ')} UZS\n${savingsBar}\n\n` +
            `<blockquote>🎯 <b>Jamg'arma Maqsadi (50%):</b>\n${savingsGoalBar} ${savingsRatio}%</blockquote>\n\n` +
            `<i>📅 ${new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}, ${new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</i>`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [colorBtn("🏠 Bosh menyu", "go_home", COLOR.BLUE)]
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

        // Category breakdown for expenses
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

        // Financial advice
        let advice = '';
        if (weekExpense > weekIncome * 0.8) {
            advice = '⚠️ <b>Ogohlantirish:</b> Xarajatlaringiz daromadingizning 80% dan oshdi! Tejashga harakat qiling.';
        } else if (weekSavings > weekIncome * 0.3) {
            advice = '🌟 <b>Ajoyib!</b> Siz daromadingizning 30%+ ni jamg\'aryapsiz. Davom eting!';
        } else {
            advice = '💡 <b>Maslahat:</b> Har bir kirimdan kamida 20% ni kopilkaga tashlashga harakat qiling.';
        }

        await ctx.editMessageText(
            `<blockquote>📈 <b>Haftalik Moliyaviy Hisobot</b></blockquote>\n\n` +
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
                            colorBtn("📊 To'liq Statistika", "show_stats", COLOR.BLUE),
                            colorBtn("🏠 Bosh menyu", "go_home", COLOR.GRAY)
                        ]
                    ]
                }
            }
        );
    } catch (e) {
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
                    [colorBtn("🏠 Bosh menyu", "go_home", COLOR.BLUE)]
                ]
            }
        });
    } catch (e) {
        ctx.editMessageText('❌ Tarixni olishda xatolik yuz berdi.');
    }
});

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function buildProgressBar(current: number, target: number): string {
    const pct = Math.min(current / target, 1);
    const filled = Math.round(pct * 10);
    const empty = 10 - filled;
    return '▓'.repeat(filled) + '░'.repeat(empty);
}

export { bot };
