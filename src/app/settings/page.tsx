import { supabase } from "@/lib/supabase";
import styles from "../page.module.css";
import localStyles from "./settings.module.css";
import CategoryManager from "@/components/CategoryManager";

export const dynamic = 'force-dynamic';

export default async function Settings() {
    const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .order('type')
        .order('name');

    return (
        <>
            <header className={styles.header}>
                <div className={styles.greeting}>
                    <p className={styles.greetingLabel}>Sozlamalar</p>
                    <h1>Tizim Sozlamalari</h1>
                </div>
            </header>

            <section className={localStyles.settingsLayout}>
                <div className={`glass-panel ${localStyles.settingsPanel}`}>
                    <h2>Profil Sozlamalari</h2>
                    <form className={localStyles.form}>
                        <div className={localStyles.formGroup}>
                            <label>Foydalanuvchi Ismi</label>
                            <input type="text" defaultValue="Degrayce" className={localStyles.input} readOnly />
                        </div>
                        <div className={localStyles.formGroup}>
                            <label>Asosiy Valyuta</label>
                            <select className={localStyles.input} disabled>
                                <option>Uzbekistan Som (UZS)</option>
                                <option>US Dollar (USD)</option>
                            </select>
                        </div>
                        <p className={localStyles.readOnlyNote}>
                            ℹ️ Profil sozlamalari hozircha o'zgartirib bo'lmaydi
                        </p>
                    </form>
                </div>

                <div className={`glass-panel ${localStyles.settingsPanel}`}>
                    <h2>Kategoriyalar</h2>
                    <p className={localStyles.description}>Bot yoki sayt orqali foydalaniladigan teglar. Qo'shing yoki o'chiring.</p>
                    <CategoryManager categories={categories || []} />
                </div>
            </section>
        </>
    );
}
