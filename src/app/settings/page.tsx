import { supabase } from "@/lib/supabase";
import styles from "../page.module.css";
import localStyles from "./settings.module.css";

export const dynamic = 'force-dynamic';

export default async function Settings() {
    const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .order('type')
        .order('name');

    return (
        <div className="layout-container">
            <main className="main-content">
                <header className={styles.header}>
                    <div className={styles.greeting}>
                        <h1>Sozlamalar</h1>
                        <p>Profilingiz va tizim sozlamalarini boshqaring.</p>
                    </div>
                </header>

                <section className={localStyles.settingsLayout}>
                    <div className={`glass-panel ${localStyles.settingsPanel}`}>
                        <h2>Profil Sozlamalari</h2>
                        <form className={localStyles.form}>
                            <div className={localStyles.formGroup}>
                                <label>Foydalanuvchi Ismi</label>
                                <input type="text" defaultValue="Degrayce" className={localStyles.input} />
                            </div>
                            <div className={localStyles.formGroup}>
                                <label>Elektron Pochta</label>
                                <input type="email" defaultValue="admin@myfinance.uz" className={localStyles.input} />
                            </div>
                            <div className={localStyles.formGroup}>
                                <label>Asosiy Valyuta</label>
                                <select className={localStyles.input}>
                                    <option>Uzbekistan Som (UZS)</option>
                                    <option>US Dollar (USD)</option>
                                </select>
                            </div>
                            <button type="submit" className={localStyles.saveBtn}>O'zgarishlarni Saqlash</button>
                        </form>
                    </div>

                    <div className={`glass-panel ${localStyles.settingsPanel}`}>
                        <h2>Mavjud Kategoriyalar</h2>
                        <p className={localStyles.description}>Bot yoki sayt orqali foydalaniladigan teglar.</p>

                        <div className={localStyles.categoryList}>
                            {categories?.map(cat => (
                                <div key={cat.id} className={localStyles.categoryItem}>
                                    <div className={localStyles.catInfo}>
                                        <div className={localStyles.colorPreview} style={{ backgroundColor: cat.color }}></div>
                                        <span className={localStyles.catName}>{cat.name}</span>
                                        <span className={localStyles.catType}>
                                            {cat.type === 'income' ? 'Kirim' : cat.type === 'savings' ? 'Jamg\'arma' : 'Chiqim'}
                                        </span>
                                    </div>
                                    <button className={localStyles.deleteBtn}>O'chirish</button>
                                </div>
                            ))}

                            <div className={localStyles.addCategory}>
                                <input type="text" placeholder="Yangi kategoriya..." className={localStyles.input} />
                                <select className={localStyles.input} style={{ width: 'auto' }}>
                                    <option value="expense">Chiqim</option>
                                    <option value="income">Kirim</option>
                                    <option value="savings">Jamg'arma</option>
                                </select>
                                <button className={localStyles.addBtn}>Qo'shish</button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
