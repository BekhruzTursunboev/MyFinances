'use client';

import { useState } from 'react';
import styles from './transactionsList.module.css';
import pageStyles from '@/app/page.module.css';
import DeleteButton from './DeleteButton';

type Transaction = {
    id: string;
    amount: number;
    type: 'income' | 'expense' | 'savings';
    description: string;
    date: string;
    categories: { name: string } | null;
};

type Category = {
    id: string;
    name: string;
    type: 'income' | 'expense' | 'savings';
};

export default function TransactionsList({
    transactions,
    categories
}: {
    transactions: Transaction[];
    categories: Category[];
}) {
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    const filtered = transactions.filter(tx => {
        const matchesSearch = !search ||
            (tx.description || '').toLowerCase().includes(search.toLowerCase()) ||
            (tx.categories?.name || '').toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === 'all' || tx.type === typeFilter;
        const matchesCategory = categoryFilter === 'all' || tx.categories?.name === categoryFilter;
        return matchesSearch && matchesType && matchesCategory;
    });

    const filteredIncome = filtered.filter(tx => tx.type === 'income').reduce((acc, tx) => acc + Number(tx.amount), 0);
    const filteredExpense = Math.abs(filtered.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + Number(tx.amount), 0));
    const filteredSavings = filtered.filter(tx => tx.type === 'savings').reduce((acc, tx) => acc + Math.abs(Number(tx.amount)), 0);

    const uniqueCategories = Array.from(new Set(transactions.map(tx => tx.categories?.name).filter(Boolean)));

    return (
        <div className={styles.wrapper}>
            {/* Filters */}
            <div className={styles.filterBar}>
                <div className={styles.searchWrapper}>
                    <span className={styles.searchIcon}>🔍</span>
                    <input
                        type="text"
                        placeholder="Qidirish..."
                        className={styles.searchInput}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className={styles.clearBtn} onClick={() => setSearch('')}>×</button>
                    )}
                </div>

                <div className={styles.filterGroup}>
                    <div className={styles.typeTabs}>
                        {[
                            { value: 'all', label: 'Hammasi' },
                            { value: 'expense', label: '🔴 Chiqim' },
                            { value: 'income', label: '🟢 Kirim' },
                            { value: 'savings', label: '🏦 Jamg\'arma' },
                        ].map(tab => (
                            <button
                                key={tab.value}
                                className={`${styles.typeTab} ${typeFilter === tab.value ? styles.typeTabActive : ''}`}
                                onClick={() => setTypeFilter(tab.value)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <select
                        className={styles.categorySelect}
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                    >
                        <option value="all">Barcha kategoriyalar</option>
                        {uniqueCategories.map(cat => (
                            <option key={cat} value={cat!}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary */}
            {filtered.length > 0 && (
                <div className={styles.summaryRow}>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Kirim</span>
                        <span className={styles.summaryValueIncome}>+{filteredIncome.toLocaleString('uz-UZ')}</span>
                    </div>
                    <div className={styles.summaryDivider} />
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Chiqim</span>
                        <span className={styles.summaryValueExpense}>-{filteredExpense.toLocaleString('uz-UZ')}</span>
                    </div>
                    <div className={styles.summaryDivider} />
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Jamg'arma</span>
                        <span className={styles.summaryValueSavings}>{filteredSavings.toLocaleString('uz-UZ')}</span>
                    </div>
                    <div className={styles.summaryDivider} />
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Jami</span>
                        <span className={styles.summaryCount}>{filtered.length} ta</span>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className={pageStyles.tableContainer}>
                <table className={pageStyles.table}>
                    <thead>
                        <tr>
                            <th>Ta'rifi</th>
                            <th>Kategoriya</th>
                            <th>Sana</th>
                            <th>Summa</th>
                            <th>Harakat</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className={styles.emptyRow}>
                                    {search || typeFilter !== 'all' || categoryFilter !== 'all'
                                        ? 'Hech qanday natija topilmadi'
                                        : 'Hech qanday tranzaksiya mavjud emas'}
                                </td>
                            </tr>
                        ) : (
                            filtered.map(tx => {
                                const dateObj = new Date(tx.date);
                                const formattedDate = dateObj.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric', year: 'numeric' });

                                let rowStyle = pageStyles.txExpense;
                                let badgeClass = pageStyles.badgeExpense;
                                let prefix = '-';

                                if (tx.type === 'income') {
                                    rowStyle = pageStyles.txIncome;
                                    badgeClass = pageStyles.badgeIncome;
                                    prefix = '+';
                                } else if (tx.type === 'savings') {
                                    rowStyle = pageStyles.txSavings;
                                    badgeClass = pageStyles.badgeSavings;
                                    prefix = '🏦 ';
                                }

                                return (
                                    <tr key={tx.id} className={pageStyles.tableRow}>
                                        <td>{tx.description || 'Izohsiz'}</td>
                                        <td>
                                            <span className={`${pageStyles.badge} ${badgeClass}`}>
                                                {tx.categories?.name || "Noma'lum"}
                                            </span>
                                        </td>
                                        <td className={pageStyles.dateCell}>{formattedDate}</td>
                                        <td className={rowStyle}>
                                            {prefix}{Math.abs(Number(tx.amount)).toLocaleString('uz-UZ')} UZS
                                        </td>
                                        <td>
                                            <DeleteButton id={tx.id} />
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
