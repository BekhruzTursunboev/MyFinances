import { supabase } from "@/lib/supabase";
import styles from "../page.module.css";
import AddTransactionForm from "@/components/AddTransactionForm";
import TransactionsList from "@/components/TransactionsList";

export const dynamic = 'force-dynamic';

export default async function Transactions() {
    const { data: rawTransactions } = await supabase
        .from('transactions')
        .select('*, categories(name)')
        .order('date', { ascending: false });

    const { data: rawCategories } = await supabase
        .from('categories')
        .select('*')
        .order('name');

    const allTransactions = rawTransactions || [];
    const categories = rawCategories || [];

    return (
        <>
            <header className={styles.header}>
                <div className={styles.greeting}>
                    <p className={styles.greetingLabel}>Tarix</p>
                    <h1>Tranzaksiyalar Tarixi</h1>
                </div>
                <AddTransactionForm categories={categories} />
            </header>

            <section className="glass-panel">
                <TransactionsList
                    transactions={allTransactions}
                    categories={categories}
                />
            </section>
        </>
    );
}
