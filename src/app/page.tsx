import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";

// Force dynamic rendering to always fetch latest data
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch actual data from Supabase
  const { data: rawTransactions, error } = await supabase
    .from('transactions')
    .select('*, categories(name)')
    .order('date', { ascending: false });

  const transactions = rawTransactions || [];

  const totalBalance = transactions.reduce((acc, tx) => acc + Number(tx.amount), 0);
  const totalIncome = transactions.filter(tx => tx.amount > 0).reduce((acc, tx) => acc + Number(tx.amount), 0);
  const totalExpenses = Math.abs(transactions.filter(tx => tx.amount < 0).reduce((acc, tx) => acc + Number(tx.amount), 0));

  // Get only top 5 for dashboard
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="layout-container">
      <main className="main-content">
        <header className={styles.header}>
          <div className={styles.greeting}>
            <h1>Overview</h1>
            <p>Welcome back, Degrayce. Here's your financial status.</p>
          </div>
          <button className={styles.addBtn}>+ Add Transaction</button>
        </header>

        <section className={styles.statsGrid}>
          <div className="glass-panel">
            <h3>Total Balance</h3>
            <p className={styles.statValue}>${totalBalance.toFixed(2)}</p>
          </div>
          <div className="glass-panel">
            <h3>Total Income</h3>
            <p className={`${styles.statValue} ${styles.income}`}>+${totalIncome.toFixed(2)}</p>
          </div>
          <div className="glass-panel">
            <h3>Total Expenses</h3>
            <p className={`${styles.statValue} ${styles.expense}`}>-${totalExpenses.toFixed(2)}</p>
          </div>
        </section>

        <section className={styles.dashboardContent}>
          <div className={`glass-panel ${styles.chartSection}`}>
            <div className={styles.sectionHeader}>
              <h2>Monthly Spending</h2>
              <select className={styles.filterSelect}>
                <option>This Month</option>
                <option>Last Month</option>
              </select>
            </div>
            {/* Placeholder for actual chart */}
            <div className={styles.chartPlaceholder}>
              {transactions.length === 0 ? (
                <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No data to show yet
                </div>
              ) : (
                <div className={styles.barContainer}>
                  <div className={styles.bar} style={{ height: '60%', backgroundColor: 'var(--accent-primary)' }}></div>
                  <div className={styles.bar} style={{ height: '40%', backgroundColor: 'var(--success)' }}></div>
                  <div className={styles.bar} style={{ height: '80%', backgroundColor: 'var(--danger)' }}></div>
                  <div className={styles.bar} style={{ height: '50%', backgroundColor: 'var(--warning)' }}></div>
                </div>
              )}
            </div>
          </div>

          <div className={`glass-panel ${styles.recentTransactions}`}>
            <div className={styles.sectionHeader}>
              <h2>Recent Transactions</h2>
              <a href="/transactions" className={styles.viewAll}>View All</a>
            </div>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No transactions yet. Add some via Telegram!</td>
                  </tr>
                ) : (
                  recentTransactions.map(tx => {
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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
