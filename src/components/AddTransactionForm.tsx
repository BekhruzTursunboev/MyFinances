'use client';

import { useState, useTransition, useRef } from 'react';
import { addTransaction } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import styles from './addTransaction.module.css';

type Category = {
    id: string;
    name: string;
    type: 'income' | 'expense' | 'savings';
};

const QUICK_AMOUNTS = [10000, 25000, 50000, 100000, 500000, 1000000];

function formatQuickAmount(amount: number): string {
    if (amount >= 1000000) return (amount / 1000000) + 'M';
    if (amount >= 1000) return (amount / 1000) + 'K';
    return amount.toString();
}

export default function AddTransactionForm({ categories }: { categories: Category[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [type, setType] = useState<'expense' | 'income' | 'savings'>('expense');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const amountRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const router = useRouter();

    function showToast(message: string, toastType: 'success' | 'error') {
        setToast({ message, type: toastType });
        setTimeout(() => setToast(null), 3000);
    }

    function handleSubmit(formData: FormData) {
        // Client-side validation BEFORE closing
        const amountStr = formData.get('amount') as string;
        const amount = parseFloat(amountStr);
        const categoryId = formData.get('category_id') as string;

        if (!amountStr || isNaN(amount) || amount <= 0) {
            showToast("❌ Iltimos, to'g'ri summa kiriting", 'error');
            return;
        }

        if (!categoryId || categoryId === '') {
            showToast('❌ Kategoriya tanlang', 'error');
            return;
        }

        formData.append('type', type);

        // Only close after validation passes
        setIsOpen(false);

        startTransition(async () => {
            const result = await addTransaction(formData);
            if (result?.success) {
                showToast('✅ Muvaffaqiyatli saqlandi!', 'success');
                // Reset form state
                if (formRef.current) formRef.current.reset();
                router.refresh();
            } else if (result?.error) {
                showToast(`❌ ${result.error}`, 'error');
            }
        });
    }

    function handleQuickAmount(amount: number) {
        if (amountRef.current) {
            amountRef.current.value = amount.toString();
            amountRef.current.focus();
        }
    }

    const filteredCategories = categories.filter(c => c.type === type);

    return (
        <>
            <button className={styles.addBtn} onClick={() => setIsOpen(true)}>
                <span className={styles.addBtnIcon}>+</span>
                Yangi Tranzaksiya
            </button>

            {toast && (
                <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
                    {toast.message}
                </div>
            )}

            {isOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsOpen(false)}>
                    <div className={`glass-panel ${styles.modalContent}`} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Yangi Amaliyot</h2>
                            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>×</button>
                        </div>

                        <div className={styles.typeSelector}>
                            <button
                                type="button"
                                className={`${styles.typeBtn} ${type === 'expense' ? styles.activeExpense : ''}`}
                                onClick={() => setType('expense')}
                            >
                                🔴 Chiqim
                            </button>
                            <button
                                type="button"
                                className={`${styles.typeBtn} ${type === 'income' ? styles.activeIncome : ''}`}
                                onClick={() => setType('income')}
                            >
                                🟢 Kirim
                            </button>
                            <button
                                type="button"
                                className={`${styles.typeBtn} ${type === 'savings' ? styles.activeSavings : ''}`}
                                onClick={() => setType('savings')}
                            >
                                🏦 Jamg'arma
                            </button>
                        </div>

                        <form ref={formRef} action={handleSubmit} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label>Miqdor (UZS)</label>
                                <input
                                    ref={amountRef}
                                    type="number"
                                    step="1000"
                                    min="1"
                                    name="amount"
                                    required
                                    className={`${styles.input} ${styles.amountInput}`}
                                    placeholder="0"
                                    autoFocus
                                />
                            </div>

                            <div className={styles.quickAmounts}>
                                {QUICK_AMOUNTS.map(amount => (
                                    <button
                                        key={amount}
                                        type="button"
                                        className={styles.quickChip}
                                        onClick={() => handleQuickAmount(amount)}
                                    >
                                        {formatQuickAmount(amount)}
                                    </button>
                                ))}
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup} style={{ flex: 1 }}>
                                    <label>Kategoriya</label>
                                    <select name="category_id" required className={styles.input}>
                                        {filteredCategories.length > 0 ? (
                                            filteredCategories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))
                                        ) : (
                                            <option value="">Teglar yo'q</option>
                                        )}
                                    </select>
                                </div>
                                <div className={styles.formGroup} style={{ width: '140px' }}>
                                    <label>Sana</label>
                                    <input type="date" name="date" required className={styles.input} defaultValue={new Date().toISOString().split('T')[0]} />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Izoh (Ixtiyoriy)</label>
                                <input type="text" name="description" className={styles.input} placeholder="Nima uchun?" />
                            </div>

                            <button type="submit" className={styles.submitBtn} disabled={filteredCategories.length === 0 || isPending}>
                                {isPending ? 'Saqlanmoqda...' : 'Saqlash'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
