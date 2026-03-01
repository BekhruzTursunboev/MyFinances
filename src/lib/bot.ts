import { Telegraf, Markup, Context } from 'telegraf';
import LocalSession from 'telegraf-session-local';
import { supabase } from './supabase';

// Define custom session context
interface SessionData {
    step?: 'waiting_for_amount' | 'waiting_for_category_type' | 'waiting_for_kopilka_amount' | 'waiting_for_expense_category' | 'waiting_for_income_category' | 'waiting_for_description';
    pendingAmount?: number;
    pendingType?: 'income' | 'expense' | 'savings';
    pendingCategoryId?: string;
    pendingCategoryName?: string;
}

interface MyContext extends Context {
    session: SessionData;
}

const bot = new Telegraf<MyContext>(process.env.TELEGRAM_BOT_TOKEN!);

// Setup local session (In Vercel production, memory works for short-lived reqs, but local file ensures testing continuity)
const localSession = new LocalSession({ database: 'session_db.json' });
bot.use(localSession.middleware());

// HELPER: Show Main Menu
const showMainMenu = async (ctx: MyContext) => {
    await ctx.reply(
        '🌟 <b>MyFinanceuz Boshqaruvi</b>\n\n' +
        'Siz xohlagan summani yozib yuboring (Masalan: <code>50000</code>), yoki pastdagi tugmalardan birini tanlang:',
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔴 Xarajat', 'add_expense'), Markup.button.callback('🟢 Daromad', 'add_income')],
                [Markup.button.callback('🏦 Kopilkaga tashlash', 'add_savings')],
                [Markup.button.callback('📊 Statistika', 'show_stats'), Markup.button.callback('🕒 Tarix', 'show_history')]
            ])
        }
    );
};

// ==========================================
// 1. ENTRY POINTS (/start, Direct Number)
// ==========================================

bot.start((ctx) => {
    ctx.session = {}; // reset state
    showMainMenu(ctx);
});

bot.help((ctx) => {
    ctx.reply('Shunchaki kiritmoqchi bo\'lgan summangizni raqamda yozib yuboring (Masalan: 50000). Qolganini o\'zim so\'rayman! 😉');
});

// ==========================================
// 2. KOPILKA (SAVINGS) FAST TRACK
// ==========================================

bot.action('add_savings', async (ctx) => {
    ctx.session.step = 'waiting_for_kopilka_amount';
    await ctx.editMessageText('🏦 <b>Kopilkaga qancha pul tashlaymiz?</b>\n\n<i>Faqat raqam yozing:</i>', { parse_mode: 'HTML' });
});

// ==========================================
// 3. MANUAL BUTTON ENTRY (Expense/Income)
// ==========================================

bot.action('add_expense', async (ctx) => {
    ctx.session.step = 'waiting_for_amount';
    ctx.session.pendingType = 'expense';
    await ctx.editMessageText('🔴 <b>Xarajat miqdorini yozing:</b>\n\n<i>Faqat raqam kiriting (masalan: 50000):</i>', { parse_mode: 'HTML' });
});

bot.action('add_income', async (ctx) => {
    ctx.session.step = 'waiting_for_amount';
    ctx.session.pendingType = 'income';
    await ctx.editMessageText('🟢 <b>Daromad miqdorini yozing:</b>\n\n<i>Faqat raqam kiriting (masalan: 1000000):</i>', { parse_mode: 'HTML' });
});

// ==========================================
// 4. SMART TEXT LISTENER (State Machine)
// ==========================================

bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (text.startsWith('/')) return;

    // Check if we are in a defined state
    const step = ctx.session.step;

    // STATE: Waiting for Kopilka Amount
    if (step === 'waiting_for_kopilka_amount') {
        const amount = parseFloat(text.replace(/[^0-9.]/g, ''));
        if (isNaN(amount)) return ctx.reply('❌ Iltimos faqat raqam kiriting.');

        // Instantly save to Kopilka. No category needed. We fetch or create the base Savings category.
        let { data: catData } = await supabase.from('categories').select('*').eq('type', 'savings').ilike('name', 'Mening Jamg\'armam').single();
        if (!catData) {
            const { data } = await supabase.from('categories').insert({ name: 'Mening Jamg\'armam', type: 'savings', color: '#eab308' }).select().single();
            catData = data;
        }

        if (catData) {
            await supabase.from('transactions').insert({ amount: Math.abs(amount), type: 'savings', category_id: catData.id, description: 'Kopilkaga' });
            ctx.session = {}; // reset
            return ctx.reply(`<blockquote>✅ <b>Saqlandi!</b></blockquote>\n🏦 <b>${amount.toLocaleString('uz-UZ')} UZS</b> Kopilkaga muvaffaqiyatli o'tkazildi! 🎉`, { parse_mode: 'HTML' });
        } else {
            return ctx.reply('❌ Tizimda xatolik. Bazangiz to\'g\'ri sozlanganiga ishonch hosil qiling.');
        }
    }

    // STATE: Waiting for an exact Amount because they clicked Expense/Income
    if (step === 'waiting_for_amount' && ctx.session.pendingType) {
        const amount = parseFloat(text.replace(/[^0-9.]/g, ''));
        if (isNaN(amount)) return ctx.reply('❌ Iltimos faqat raqam kiriting.');

        ctx.session.pendingAmount = amount;

        // Fetch categories for the type
        const { data } = await supabase.from('categories').select('name').eq('type', ctx.session.pendingType);
        const buttons = data?.map(c => [Markup.button.callback(c.name, `chose_cat_${c.name}`)]) || [];

        ctx.session.step = ctx.session.pendingType === 'expense' ? 'waiting_for_expense_category' : 'waiting_for_income_category';

        return ctx.reply(`Siz <b>${amount.toLocaleString('uz-UZ')} UZS</b> kiritdingiz.\nQaysi kategoriyaga kiradi?`, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(buttons)
        });
    }

    // STATE: Waiting for optional description
    if (step === 'waiting_for_description') {
        const desc = text === '-' ? '' : text; // if they just type - we skip it
        const type = ctx.session.pendingType!;
        const amount = ctx.session.pendingAmount!;
        const finalAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);

        await supabase.from('transactions').insert({
            amount: finalAmount,
            type: type,
            category_id: ctx.session.pendingCategoryId,
            description: desc
        });

        const icon = type === 'income' ? '🟢 +' : '🔴 ';
        ctx.reply(`<blockquote>✅ <b>Saqlandi!</b></blockquote>\n${icon}${Math.abs(amount).toLocaleString('uz-UZ')} UZS ➔ #${ctx.session.pendingCategoryName}\n<i>${desc}</i>`, { parse_mode: 'HTML' });

        ctx.session = {}; // reset
        return;
    }

    // -------------------------------------------------------------
    // DEFAULT STATE (Casual flow): They just typed a random message
    // -------------------------------------------------------------

    // Attempt to parse out a number
    const extractedNumberMatch = text.match(/([+-]?\$?\d+(?:\.\d+)?)/);

    if (extractedNumberMatch) {
        const amountStr = extractedNumberMatch[1].replace(/[^0-9.+-]/g, '');
        const amount = Math.abs(parseFloat(amountStr));

        if (!isNaN(amount)) {
            // Check if they typed a string AFTER the number (Pro Mode match)
            const proMatch = text.match(/^([+-]?\$?\d+(?:\.\d+)?)\s+(\w+)(?:\s+(?:-|—)\s+(.*))?$/i);
            if (proMatch) {
                const rawCat = proMatch[2];
                const desc = proMatch[3] || '';

                // Directly try to find and save it
                let { data: catData } = await supabase.from('categories').select('*').ilike('name', rawCat).maybeSingle();

                if (catData) {
                    const finalAmount = catData.type === 'expense' ? -amount : amount;
                    await supabase.from('transactions').insert({ amount: finalAmount, type: catData.type, category_id: catData.id, description: desc });
                    const icon = catData.type === 'income' ? '🟢 +' : catData.type === 'savings' ? '🏦 ' : '🔴 ';
                    return ctx.reply(`<blockquote>✅ <b>Tezkor Saqlandi!</b></blockquote>\n${icon}${amount.toLocaleString('uz-UZ')} UZS ➔ #${catData.name}\n<i>${desc}</i>`, { parse_mode: 'HTML' });
                }
            }

            // If pure number OR no matching category, fall into Casual Flow
            ctx.session.pendingAmount = amount;
            ctx.session.step = 'waiting_for_category_type';
            return ctx.reply(
                `Siz <b>${amount.toLocaleString('uz-UZ')} UZS</b> kiritdingiz. Bu nima?\nQuyidagilardan birini tanlang:`,
                {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('🔴 Xarajat', 'sel_type_expense'), Markup.button.callback('🟢 Kirim', 'sel_type_income')],
                        [Markup.button.callback('🏦 Kopilkaga tashlash', 'sel_type_savings')]
                    ])
                }
            );
        }
    }

    // Completely unparsed
    ctx.reply('Tushunmadim 😕\nSiz kiritmoqchi bo\'lgan summani kiriting (masalan 50000) yoki /start buyrug\'ini yuboring.');
});

// ==========================================
// 5. CALLBACK HANDLERS
// ==========================================

// Handlers for "Siz kiritdingiz, endi tanlang" buttons
bot.action(/sel_type_(.+)/, async (ctx) => {
    const type = ctx.match[1] as 'expense' | 'income' | 'savings';
    const amount = ctx.session.pendingAmount;

    if (!amount) {
        ctx.session = {};
        return ctx.editMessageText('❌ Sessiya vaqti tugagan. Qaytadan /start buyrug\'ini bering.');
    }

    if (type === 'savings') {
        let { data: catData } = await supabase.from('categories').select('*').eq('type', 'savings').ilike('name', 'Mening Jamg\'armam').single();
        if (catData) {
            await supabase.from('transactions').insert({ amount: amount, type: 'savings', category_id: catData.id, description: 'Kopilkaga' });
            ctx.session = {};
            return ctx.editMessageText(`<blockquote>✅ <b>Saqlandi!</b></blockquote>\n🏦 <b>${amount.toLocaleString('uz-UZ')} UZS</b> Kopilkaga muvaffaqiyatli o'tkazildi! 🎉`, { parse_mode: 'HTML' });
        }
    }

    ctx.session.pendingType = type;

    const { data } = await supabase.from('categories').select('name').eq('type', type);
    const buttons = data?.map(c => [Markup.button.callback(c.name, `chose_cat_${c.name}`)]) || [];

    ctx.session.step = type === 'expense' ? 'waiting_for_expense_category' : 'waiting_for_income_category';

    await ctx.editMessageText(`Qaysi kategoriyaga kiradi?`, Markup.inlineKeyboard(buttons));
});

// Category selected from inline list
bot.action(/chose_cat_(.+)/, async (ctx) => {
    const catName = ctx.match[1];
    const type = ctx.session.pendingType;

    if (!type || !ctx.session.pendingAmount) {
        ctx.session = {};
        return ctx.editMessageText('❌ Sessiya xatosi. Qaytadan /start buyrug\'ini bering.');
    }

    const { data: catData } = await supabase.from('categories').select('id').ilike('name', catName).single();

    if (catData) {
        ctx.session.pendingCategoryId = catData.id;
        ctx.session.pendingCategoryName = catName;
        ctx.session.step = 'waiting_for_description';

        await ctx.editMessageText(`✅ Kategoriya: <b>${catName}</b>\n\n📝 Endi qisqacha izoh yozing.\n(Agar izohsiz saqlamoqchi bo'lsangiz, shunchaki <b>-</b> belgisini yuboring yoki quyidagilarni bosing):`, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([[Markup.button.callback('⏭ O\'tkazib yuborish (Izohsiz)', 'skip_description')]])
        });
    } else {
        ctx.editMessageText("❌ Kategoriya xatosi.");
    }
});

// Skip Description Button
bot.action('skip_description', async (ctx) => {
    const type = ctx.session.pendingType!;
    const amount = ctx.session.pendingAmount!;
    const finalAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);

    await supabase.from('transactions').insert({
        amount: finalAmount,
        type: type,
        category_id: ctx.session.pendingCategoryId,
        description: ''
    });

    const icon = type === 'income' ? '🟢 +' : '🔴 ';
    await ctx.editMessageText(`<blockquote>✅ <b>Saqlandi!</b></blockquote>\n${icon}${Math.abs(amount).toLocaleString('uz-UZ')} UZS ➔ #${ctx.session.pendingCategoryName}`, { parse_mode: 'HTML' });

    ctx.session = {}; // reset
});

// ==========================================
// 6. GLOBAL COMMANDS
// ==========================================

bot.action('show_stats', async (ctx) => {
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
            `📈 <b>Jami Kirim:</b> <tg-emoji emoji-id="5368324170671202286">🟢</tg-emoji> +${income.toLocaleString('uz-UZ')} UZS\n` +
            `📉 <b>Jami Chiqim:</b> <tg-emoji emoji-id="5368324170671202286">🔴</tg-emoji> -${expenses.toLocaleString('uz-UZ')} UZS\n` +
            `🏦 <b>Jamg'arma (Kopilka):</b> <tg-emoji emoji-id="5368324170671202286">🟡</tg-emoji> ${savings.toLocaleString('uz-UZ')} UZS\n\n` +
            `<i><tg-date date="${Math.floor(Date.now() / 1000)}">Bugun, {time}</tg-date> da yangilandi</i>`,
            { parse_mode: 'HTML' }
        );
    } catch (e) {
        ctx.editMessageText('❌ Statistika yuklanmadi. Baza sozlanganligini tekshiring.');
    }
});

bot.action('show_history', async (ctx) => {
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
            const unixDate = Math.floor(new Date(tx.date).getTime() / 1000);

            msg += `${icon} <b>${Math.abs(tx.amount).toLocaleString('uz-UZ')}</b> • #${catName} • <i><tg-date date="${unixDate}">{time}</tg-date></i>\n`;
            if (tx.description) msg += `   └ <i>${tx.description}</i>\n\n`;
        });

        ctx.editMessageText(msg, { parse_mode: 'HTML' });
    } catch (e) {
        ctx.editMessageText('❌ Tarixni olishda xatolik yuz berdi. Baza sozlanganligini tekshiring.');
    }
});

export { bot };
