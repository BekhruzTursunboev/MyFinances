'use client';

import { useState, useTransition, useRef } from 'react';
import { addTransaction } from '@/lib/actions';
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
    const [showSuccess, setShowSuccess] = useState(false);
    const amountRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    function handleSubmit(formData: FormData) {
        formData.append('type', type);

        setIsOpen(false);

        startTransition(async () => {
            const result = await addTransaction(formData);
            if (result?.success) {
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 2500);
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

            {showSuccess && (
                <div className="toast toast-success">
                    ✅ Muvaffaqiyatli saqlandi!
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
