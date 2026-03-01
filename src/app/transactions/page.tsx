import { supabase } from "@/lib/supabase";
import styles from "../page.module.css";
import localStyles from "./transactions.module.css";
import AddTransactionForm from "@/components/AddTransactionForm";

export const dynamic = 'force-dynamic';

export default async function Transactions() {
    const { data: rawTransactions, error } = await supabase
        .from('transactions')
        .select('*, categories(name)')
        .order('date', { ascending: false });

    // Fetch categories for the Add transaction form
    const { data: rawCategories } = await supabase
        .from('categories')
        .select('*')
        .order('name');

    const allTransactions = rawTransactions || [];
    const categories = rawCategories || [];

    return (
        <div className="layout-container">
            <main className="main-content">
                <header className={styles.header}>
                    <div className={styles.greeting}>
                        <h1>Tranzaksiyalar Tarixi</h1>
                        <p>Barcha moliyaviy amaliyotlaringiz shu yerdan topiladi.</p>
                    </div>
                    <AddTransactionForm categories={categories} />
                </header>

                <section className={`glass-panel ${localStyles.transactionsWrapper}`}>
                    <div className={styles.sectionHeader}>
                        <div className={localStyles.filters}>
                            <input type="text" placeholder="Qidirish..." className={localStyles.searchInput} />
                            <select className={styles.filterSelect}>
                                <option>Barcha Kategoriyalar</option>
                                <option>Oziq-ovqat</option>
                                <option>Kirim</option>
                                <option>Jamg'arma</option>
                            </select>
                        </div>
                    </div>

                    <table className={styles.table}>
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
                            {allTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                        Hech qanday tranzaksiya mavjud emas.
                                    </td>
                                </tr>
                            ) : (
                                allTransactions.map(tx => {
                                    const dateObj = new Date(tx.date);
                                    const formattedDate = dateObj.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric', year: 'numeric' });

                                    let rowStyle = styles.txExpense;
                                    let badgeClass = styles.badgeExpense;
                                    let prefix = '-';

                                    if (tx.type === 'income') {
                                        rowStyle = styles.txIncome;
                                        badgeClass = styles.badgeIncome;
                                        prefix = '+';
                                    } else if (tx.type === 'savings') {
                                        rowStyle = styles.txSavings;
                                        badgeClass = styles.badgeSavings;
                                        prefix = '🏦 ';
                                    }

                                    return (
                                        <tr key={tx.id} className={styles.tableRow}>
                                            <td>{tx.description || 'Izohsiz'}</td>
                                            <td>
                                                <span className={`${styles.badge} ${badgeClass}`}>
                                                    {tx.categories?.name || 'Noma\'lum'}
                                                </span>
                                            </td>
                                            <td className={styles.dateCell}>{formattedDate}</td>
                                            <td className={rowStyle}>
                                                {prefix}{Math.abs(Number(tx.amount)).toLocaleString('uz-UZ')} UZS
                                            </td>
                                            <td>
                                                <button className={localStyles.actionBtn}>Tahrirlash</button>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </section>
            </main>
        </div>
    );
}
