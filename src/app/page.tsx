import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";
import AddTransactionForm from "@/components/AddTransactionForm";
import DeleteButton from "@/components/DeleteButton";
import { FadeIn } from "@/components/Animations";

// Force dynamic rendering to always fetch latest data
export const dynamic = 'force-dynamic';

export default async function Home() {
  const { data: rawTransactions } = await supabase
    .from('transactions')
    .select('*, categories(name)')
    .order('date', { ascending: false });

  const { data: rawCategories } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  const transactions = rawTransactions || [];
  const categories = rawCategories || [];

  const totalIncome = transactions.filter(tx => tx.type === 'income').reduce((acc, tx) => acc + Number(tx.amount), 0);
  const totalExpenses = Math.abs(transactions.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + Number(tx.amount), 0));
  const totalSavings = transactions.filter(tx => tx.type === 'savings').reduce((acc, tx) => acc + Math.abs(Number(tx.amount)), 0);
  const totalBalance = totalIncome - totalExpenses - totalSavings;

  // Real trend: compare this month vs last month
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonthTx = transactions.filter(tx => new Date(tx.date) >= thisMonthStart);
  const lastMonthTx = transactions.filter(tx => {
    const d = new Date(tx.date);
    return d >= lastMonthStart && d < thisMonthStart;
  });

  const thisMonthIncome = thisMonthTx.filter(tx => tx.type === 'income').reduce((acc, tx) => acc + Number(tx.amount), 0);
  const lastMonthIncome = lastMonthTx.filter(tx => tx.type === 'income').reduce((acc, tx) => acc + Number(tx.amount), 0);
  const thisMonthExpense = Math.abs(thisMonthTx.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + Number(tx.amount), 0));
  const lastMonthExpense = Math.abs(lastMonthTx.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + Number(tx.amount), 0));

  const incomeTrend = lastMonthIncome > 0 ? (((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100) : 0;
  const expenseTrend = lastMonthExpense > 0 ? (((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100) : 0;

  const txCount = transactions.length;
  const recentTransactions = transactions.slice(0, 5);

  // Spending insight
  let insight = '';
  if (totalExpenses > totalIncome * 0.8) {
    insight = '⚠️ Xarajatlar daromadning 80%+ — ehtiyot bo\'ling!';
  } else if (totalSavings > totalIncome * 0.3) {
    insight = '🌟 Ajoyib! Daromadning 30%+ jamg\'arma — davom eting!';
  } else if (txCount > 0) {
    insight = '💡 Har oyda kamida 20% jamg\'armaga ajrating';
  }

  return (
    <>
      <header className={styles.header}>
        <div className={styles.greeting}>
          <p className={styles.greetingLabel}>Bosh Sahifa</p>
          <h1>Xush kelibsiz, Degrayce 👋</h1>
          {insight && <p className={styles.insight}>{insight}</p>}
        </div>
        <AddTransactionForm categories={categories} />
      </header>

      <FadeIn delay={0.05}>
        <section className={styles.statsGrid}>
          <div className={`glass-panel ${styles.statCard} ${styles.balanceCard}`}>
            <div className={styles.statHeader}>
              <div className={styles.statIconWrapper} data-type="balance">💰</div>
              {txCount > 0 && (
                <span className={`${styles.statTrend} ${incomeTrend >= 0 ? styles.trendUp : styles.trendDown}`}>
                  {incomeTrend >= 0 ? '↑' : '↓'} {Math.abs(incomeTrend).toFixed(1)}%
                </span>
              )}
            </div>
            <div className={styles.statBody}>
              <span className={styles.statLabel}>Umumiy Balans</span>
              <span className={styles.statValue}>{totalBalance.toLocaleString('uz-UZ')} <small>UZS</small></span>
            </div>
          </div>

          <div className={`glass-panel ${styles.statCard} ${styles.incomeCard}`}>
            <div className={styles.statHeader}>
              <div className={styles.statIconWrapper} data-type="income">📈</div>
            </div>
            <div className={styles.statBody}>
              <span className={styles.statLabel}>Jami Kirim</span>
              <span className={`${styles.statValue} ${styles.income}`}>+{totalIncome.toLocaleString('uz-UZ')} <small>UZS</small></span>
            </div>
          </div>

          <div className={`glass-panel ${styles.statCard} ${styles.expenseCard}`}>
            <div className={styles.statHeader}>
              <div className={styles.statIconWrapper} data-type="expense">📉</div>
              {txCount > 0 && (
                <span className={`${styles.statTrend} ${expenseTrend <= 0 ? styles.trendUp : styles.trendDown}`}>
                  {expenseTrend <= 0 ? '↓' : '↑'} {Math.abs(expenseTrend).toFixed(1)}%
                </span>
              )}
            </div>
            <div className={styles.statBody}>
              <span className={styles.statLabel}>Jami Chiqim</span>
              <span className={`${styles.statValue} ${styles.expense}`}>-{totalExpenses.toLocaleString('uz-UZ')} <small>UZS</small></span>
            </div>
          </div>

          <div className={`glass-panel ${styles.statCard} ${styles.savingsCardEl}`}>
            <div className={styles.statHeader}>
              <div className={styles.statIconWrapper} data-type="savings">🏦</div>
              <span className={styles.savingsLabel}>Muxim!</span>
            </div>
            <div className={styles.statBody}>
              <span className={styles.statLabel}>Jamg'arma (Alohida)</span>
              <span className={`${styles.statValue} ${styles.savings}`}>{totalSavings.toLocaleString('uz-UZ')} <small>UZS</small></span>
            </div>
          </div>
        </section>
      </FadeIn>

      <FadeIn delay={0.15}>
        <section className={styles.dashboardContent}>
          <div className={`glass-panel ${styles.chartSection}`}>
            <div className={styles.sectionHeader}>
              <h2>Moliyaviy Xulosa</h2>
            </div>
            <div className={styles.chartPlaceholder}>
              {transactions.length === 0 ? (
                <div className={styles.emptyChart}>
                  <span className={styles.emptyIcon}>📊</span>
                  <p>Hali ma'lumot yo'q</p>
                  <small>Telegram bot yoki yuqoridagi tugma orqali kiriting</small>
                </div>
              ) : (
                <div className={styles.barContainer}>
                  {[
                    { value: totalIncome, label: 'Kirim', color: 'var(--success)', glow: 'var(--shadow-glow-success)' },
                    { value: totalExpenses, label: 'Chiqim', color: 'var(--danger)', glow: 'var(--shadow-glow-danger)' },
                    { value: totalSavings, label: "Jamg'arma", color: 'var(--warning)', glow: 'var(--shadow-glow-warning)' }
                  ].map((item, idx) => {
                    const max = Math.max(totalIncome, totalExpenses, totalSavings) || 1;
                    const heightPercentage = Math.max(8, (item.value / max) * 100);

                    return (
                      <div key={idx} className={styles.barGroup}>
                        <span className={styles.barValue}>
                          {item.value >= 1000000
                            ? (item.value / 1000000).toFixed(1) + 'M'
                            : item.value >= 1000
                              ? (item.value / 1000).toFixed(0) + 'K'
                              : item.value.toLocaleString('uz-UZ')}
                        </span>
                        <div className={styles.barTrack}>
                          <div
                            className={styles.bar}
                            style={{
                              height: `${heightPercentage}%`,
                              backgroundColor: item.color,
                              boxShadow: item.glow
                            }}
                          ></div>
                        </div>
                        <span className={styles.barLabel}>{item.label}</span>
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
              <a href="/transactions" className={styles.viewAll}>Hammasini ko'rish →</a>
            </div>

            <div className={styles.txList}>
              {recentTransactions.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>💸</span>
                  <p>Tranzaksiyalar mavjud emas</p>
                </div>
              ) : (
                recentTransactions.map(tx => {
                  const dateObj = new Date(tx.date);
                  const formattedDate = dateObj.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' });

                  let typeIcon = '🔴';
                  let amountClass = styles.txExpense;
                  let prefix = '-';

                  if (tx.type === 'income') {
                    typeIcon = '🟢';
                    amountClass = styles.txIncome;
                    prefix = '+';
                  } else if (tx.type === 'savings') {
                    typeIcon = '🏦';
                    amountClass = styles.txSavings;
                    prefix = '';
                  }

                  return (
                    <div key={tx.id} className={styles.txRow}>
                      <div className={styles.txIcon}>{typeIcon}</div>
                      <div className={styles.txInfo}>
                        <span className={styles.txDesc}>{tx.description || 'Izohsiz'}</span>
                        <span className={styles.txMeta}>{tx.categories?.name || "Noma'lum"} • {formattedDate}</span>
                      </div>
                      <div className={styles.txRight}>
                        <span className={amountClass}>
                          {prefix}{Math.abs(Number(tx.amount)).toLocaleString('uz-UZ')} UZS
                        </span>
                        <DeleteButton id={tx.id} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </FadeIn>
    </>
  );
}
