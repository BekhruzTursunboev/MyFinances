'use client';

import { useState } from 'react';
import { addTransaction } from '@/lib/actions';
import styles from './addTransaction.module.css';

type Category = {
    id: string;
    name: string;
    type: 'income' | 'expense' | 'savings';
};

export default function AddTransactionForm({ categories }: { categories: Category[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [type, setType] = useState<'expense' | 'income' | 'savings'>('expense');

    async function handleSubmit(formData: FormData) {
        setIsSubmitting(true);
        formData.append('type', type);

        await addTransaction(formData);

        setIsSubmitting(false);
        setIsOpen(false);
    }

    const filteredCategories = categories.filter(c => c.type === type);

    return (
        <>
            <button className={styles.addBtn} onClick={() => setIsOpen(true)}>
                + Yangi Tranzaksiya
            </button>

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

                        <form action={handleSubmit} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label>Miqdor (UZS)</label>
                                <input type="number" step="1000" name="amount" required className={styles.input} placeholder="50000" />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Kategoriya</label>
                                <select name="category_id" required className={styles.input}>
                                    {filteredCategories.length > 0 ? (
                                        filteredCategories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))
                                    ) : (
                                        <option value="">Ushbu turdagi teglar yo'q</option>
                                    )}
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Izoh (Ixtiyoriy)</label>
                                <input type="text" name="description" className={styles.input} placeholder="Nima uchun ketdi?" />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Sana</label>
                                <input type="date" name="date" required className={styles.input} defaultValue={new Date().toISOString().split('T')[0]} />
                            </div>

                            <button type="submit" className={styles.submitBtn} disabled={isSubmitting || filteredCategories.length === 0}>
                                {isSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
