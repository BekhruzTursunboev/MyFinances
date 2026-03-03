'use server';

import { supabase } from './supabase';
import { revalidatePath } from 'next/cache';

export async function addTransaction(formData: FormData) {
    const amount = parseFloat(formData.get('amount') as string);
    const type = formData.get('type') as 'income' | 'expense' | 'savings';
    const categoryId = formData.get('category_id') as string;
    const description = formData.get('description') as string;
    const date = formData.get('date') as string;

    const actualAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);

    const { error } = await supabase
        .from('transactions')
        .insert({
            amount: actualAmount,
            type,
            category_id: categoryId,
            description,
            date: date ? new Date(date).toISOString() : new Date().toISOString()
        });

    if (error) {
        console.error('Error adding transaction:', error);
        return { error: error.message };
    }

    revalidatePath('/');
    revalidatePath('/transactions');
    return { success: true };
}

export async function deleteTransaction(id: string) {
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
    const colors: Record<string, string> = {
        expense: '#f87171',
        income: '#34d399',
        savings: '#fbbf24'
    };

    const { data, error } = await supabase
        .from('categories')
        .insert({
            name,
            type,
            color: colors[type] || '#60a5fa'
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding category:', error);
        return { error: error.message };
    }

    revalidatePath('/');
    revalidatePath('/transactions');
    revalidatePath('/settings');
    return { success: true, category: data };
}

export async function deleteCategory(id: string) {
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
