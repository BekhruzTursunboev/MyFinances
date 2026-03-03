'use server';

import { supabase } from './supabase';
import { revalidatePath } from 'next/cache';

export async function addTransaction(formData: FormData) {
    const rawAmount = formData.get('amount') as string;
    const type = formData.get('type') as 'income' | 'expense' | 'savings';
    const categoryId = formData.get('category_id') as string;
    const description = (formData.get('description') as string) || '';
    const date = formData.get('date') as string;

    // Server-side validation
    const amount = parseFloat(rawAmount);
    if (!rawAmount || isNaN(amount) || amount <= 0) {
        return { error: "Noto'g'ri summa. Iltimos, musbat raqam kiriting." };
    }
    if (!type || !['income', 'expense', 'savings'].includes(type)) {
        return { error: "Noto'g'ri tur." };
    }
    if (!categoryId || categoryId.trim() === '') {
        return { error: 'Kategoriya tanlanmagan.' };
    }

    const actualAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
    const txDate = date ? new Date(date + 'T12:00:00').toISOString() : new Date().toISOString();

    const { error } = await supabase
        .from('transactions')
        .insert({
            amount: actualAmount,
            type,
            category_id: categoryId,
            description: description.trim(),
            date: txDate
        });

    if (error) {
        console.error('Error adding transaction:', error);
        return { error: 'Saqlashda xatolik: ' + error.message };
    }

    revalidatePath('/');
    revalidatePath('/transactions');
    return { success: true };
}

export async function deleteTransaction(id: string) {
    if (!id) return { error: "ID ko'rsatilmagan." };

    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting transaction:', error);
        return { error: error.message };
    }

    revalidatePath('/');
    revalidatePath('/transactions');
    return { success: true };
}

export async function addCategory(name: string, type: 'income' | 'expense' | 'savings') {
    if (!name || name.trim().length === 0) {
        return { error: "Kategoriya nomi bo'sh bo'lishi mumkin emas." };
    }
    if (!['income', 'expense', 'savings'].includes(type)) {
        return { error: "Noto'g'ri tur." };
    }

    const colors: Record<string, string> = {
        expense: '#f87171',
        income: '#34d399',
        savings: '#fbbf24'
    };

    const { data, error } = await supabase
        .from('categories')
        .insert({
            name: name.trim(),
            type,
            color: colors[type] || '#60a5fa'
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding category:', error);
        return { error: 'Xatolik: ' + error.message };
    }

    revalidatePath('/');
    revalidatePath('/transactions');
    revalidatePath('/settings');
    return { success: true, category: data };
}

export async function deleteCategory(id: string) {
    if (!id) return { error: "ID ko'rsatilmagan." };

    // First check if category has transactions
    const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', id);

    if (count && count > 0) {
        return { error: `Bu kategoriyada ${count} ta tranzaksiya bor. Avval ularni o'chiring.` };
    }

    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting category:', error);
        return { error: error.message };
    }

    revalidatePath('/');
    revalidatePath('/transactions');
    revalidatePath('/settings');
    return { success: true };
}
