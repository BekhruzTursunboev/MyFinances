import { supabase } from "@/lib/supabase";
import styles from "../page.module.css";
import localStyles from "./transactions.module.css";

export const dynamic = 'force-dynamic';

export default async function Transactions() {
    const { data: rawTransactions, error } = await supabase
        .from('transactions')
        .select('*, categories(name)')
        .order('date', { ascending: false });

    const allTransactions = rawTransactions || [];

    return (
        <div className="layout-container">
            <main className="main-content">
                <header className={styles.header}>
                    <div className={styles.greeting}>
                        <h1>All Transactions</h1>
                        <p>A complete history of your finances.</p>
                    </div>
                    <button className={styles.addBtn}>+ Add Transaction</button>
                </header>

                <section className={`glass-panel ${localStyles.transactionsWrapper}`}>
                    <div className={styles.sectionHeader}>
                        <div className={localStyles.filters}>
                            <input type="text" placeholder="Search transactions..." className={localStyles.searchInput} />
                            <select className={styles.filterSelect}>
                                <option>All Categories</option>
                                <option>Food</option>
                                <option>Income</option>
                                <option>Entertainment</option>
                            </select>
                        </div>
                    </div>

                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th>Category</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No transactions yet. Add some via Telegram!</td>
                                </tr>
                            ) : (
                                allTransactions.map(tx => {
                                    const dateObj = new Date(tx.date);
                                    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                                    return (
                                        <tr key={tx.id}>
                                            <td>{tx.description || 'No description'}</td>
                                            <td>
                                                <span className={`${styles.badge} ${tx.amount > 0 ? styles.badgeIncome : styles.badgeExpense}`}>
                                                    {tx.categories?.name || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className={styles.dateCell}>{formattedDate}</td>
                                            <td className={tx.amount > 0 ? styles.txIncome : styles.txExpense}>
                                                {tx.amount > 0 ? '+' : ''}{Number(tx.amount).toFixed(2)}$
                                            </td>
                                            <td>
                                                <button className={localStyles.actionBtn}>Edit</button>
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
