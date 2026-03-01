'use client';

import { useState } from 'react';
import { addTransaction } from '@/lib/actions';
import styles from './addTransaction.module.css';

type Category = {
    id: string;
    name: string;
    type: 'income' | 'expense';
};

export default function AddTransactionForm({ categories }: { categories: Category[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [type, setType] = useState<'expense' | 'income'>('expense');

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
                + Add Transaction
            </button>

            {isOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsOpen(false)}>
                    <div className={`glass-panel ${styles.modalContent}`} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Add Transaction</h2>
                            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>×</button>
                        </div>

                        <div className={styles.typeSelector}>
                            <button
                                type="button"
                                className={`${styles.typeBtn} ${type === 'expense' ? styles.activeExpense : ''}`}
                                onClick={() => setType('expense')}
                            >
                                Expense
                            </button>
                            <button
                                type="button"
                                className={`${styles.typeBtn} ${type === 'income' ? styles.activeIncome : ''}`}
                                onClick={() => setType('income')}
                            >
                                Income
                            </button>
                        </div>

                        <form action={handleSubmit} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label>Amount ($)</label>
                                <input type="number" step="0.01" name="amount" required className={styles.input} placeholder="0.00" />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Category</label>
                                <select name="category_id" required className={styles.input}>
                                    {filteredCategories.length > 0 ? (
                                        filteredCategories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))
                                    ) : (
                                        <option value="">No categories available</option>
                                    )}
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Description (Optional)</label>
                                <input type="text" name="description" className={styles.input} placeholder="What was this for?" />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Date</label>
                                <input type="date" name="date" required className={styles.input} defaultValue={new Date().toISOString().split('T')[0]} />
                            </div>

                            <button type="submit" className={styles.submitBtn} disabled={isSubmitting || filteredCategories.length === 0}>
                                {isSubmitting ? 'Saving...' : 'Save Transaction'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
