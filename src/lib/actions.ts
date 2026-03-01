'use server';

import { supabase } from './supabase';
import { revalidatePath } from 'next/cache';

export async function addTransaction(formData: FormData) {
    const amount = parseFloat(formData.get('amount') as string);
    const type = formData.get('type') as 'income' | 'expense';
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
