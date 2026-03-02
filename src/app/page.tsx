import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";
import AddTransactionForm from "@/components/AddTransactionForm";
import DeleteButton from "@/components/DeleteButton";

// Force dynamic rendering to always fetch latest data
export const dynamic = 'force-dynamic';

export default async function Home() {
  const { data: rawTransactions, error } = await supabase
    .from('transactions')
    .select('*, categories(name)')
    .order('date', { ascending: false });

  // Fetch categories for the Add transaction form
  const { data: rawCategories } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  const transactions = rawTransactions || [];
  const categories = rawCategories || [];

  const totalIncome = transactions.filter(tx => tx.type === 'income').reduce((acc, tx) => acc + Number(tx.amount), 0);
  const totalExpenses = Math.abs(transactions.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + Number(tx.amount), 0));
  const totalSavings = transactions.filter(tx => tx.type === 'savings').reduce((acc, tx) => acc + Math.abs(Number(tx.amount)), 0);

  // Effective checking balance
  const totalBalance = totalIncome - totalExpenses - totalSavings;

  // Get only top 5 for dashboard
  const recentTransactions = transactions.slice(0, 5);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.greeting}>
          <h1>Bosh Sahifa</h1>
          <p>Xush kelibsiz, Degrayce. Moliyaviy xulosangiz.</p>
        </div>
        <AddTransactionForm categories={categories} />
      </header>

      <section className={styles.statsGrid}>
        <div className={`glass-panel ${styles.statCard}`}>
          <div className={styles.statHeader}>
            <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-primary)' }}>
              💰
            </div>
            <span className={styles.statTrend}>+2.4%</span>
          </div>
          <h3>Umumiy Balans</h3>
          <p className={styles.statValue}>{totalBalance.toLocaleString('uz-UZ')} UZS</p>
        </div>

        <div className={`glass-panel ${styles.statCard}`}>
          <div className={styles.statHeader}>
            <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
              📈
            </div>
          </div>
          <h3>Jami Kirim</h3>
          <p className={`${styles.statValue} ${styles.income}`}>+{totalIncome.toLocaleString('uz-UZ')} UZS</p>
        </div>

        <div className={`glass-panel ${styles.statCard}`}>
          <div className={styles.statHeader}>
            <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
              📉
            </div>
          </div>
          <h3>Jami Chiqim</h3>
          <p className={`${styles.statValue} ${styles.expense}`}>-{totalExpenses.toLocaleString('uz-UZ')} UZS</p>
        </div>

        <div className={`glass-panel ${styles.statCard} ${styles.savingsCard}`}>
          <div className={styles.statHeader}>
            <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
              🏦
            </div>
            <span className={styles.savingsLabel}>Muxim!</span>
          </div>
          <h3>Jamg'arma (Alohida)</h3>
          <p className={`${styles.statValue} ${styles.savings}`}>{totalSavings.toLocaleString('uz-UZ')} UZS</p>
        </div>
      </section>

      <section className={styles.dashboardContent}>
        <div className={`glass-panel ${styles.chartSection}`}>
          <div className={styles.sectionHeader}>
            <h2>Oylik Xarajatlar Oqimi</h2>
          </div>
          {/* Functional relative bar chart based on actual values */}
          <div className={styles.chartPlaceholder}>
            {transactions.length === 0 ? (
              <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Hali ma'lumot yo'q. Telegram bot orqali kiriting!
              </div>
            ) : (
              <div className={styles.barContainer}>
                {[totalIncome, totalExpenses, totalSavings].map((val, idx) => {
                  const max = Math.max(totalIncome, totalExpenses, totalSavings) || 1;
                  const heightPercentage = Math.max(10, (val / max) * 100);
                  const colors = ['var(--success)', 'var(--danger)', 'var(--warning)'];
                  const labels = ['Kirim', 'Chiqim', 'Jamg\'arma'];

                  return (
                    <div key={idx} className={styles.barGroup}>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.bar}
                          style={{
                            height: `${heightPercentage}%`,
                            backgroundColor: colors[idx],
                            boxShadow: `0 0 15px ${colors[idx]}40`
                          }}
                        ></div>
                      </div>
                      <span className={styles.barLabel}>{labels[idx]}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className={`glass-panel ${styles.recentTransactions}`}>
          <div className={styles.sectionHeader}>
            <h2>So'nggi Amaliyotlar</h2>
            <a href="/transactions" className={styles.viewAll}>Hammasini ko'rish &rarr;</a>
          </div>

          <div className={styles.tableContainer}>
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
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      Tranzaksiyalar mavjud emas.
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map(tx => {
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
      </section>
    </>
  );
}
