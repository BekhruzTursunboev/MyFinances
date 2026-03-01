import styles from "../page.module.css";
import localStyles from "./settings.module.css";

export default function Settings() {
    return (
        <div className="layout-container">
            <main className="main-content">
                <header className={styles.header}>
                    <div className={styles.greeting}>
                        <h1>Settings</h1>
                        <p>Manage your preferences and categories.</p>
                    </div>
                </header>

                <section className={localStyles.settingsGrid}>
                    <div className={`glass-panel ${localStyles.settingsGroup}`}>
                        <h2>Profile</h2>
                        <div className={localStyles.formGroup}>
                            <label>Name</label>
                            <input type="text" defaultValue="Degrayce Cheso" className={localStyles.input} />
                        </div>
                        <div className={localStyles.formGroup}>
                            <label>Email</label>
                            <input type="email" defaultValue="degrayce@example.com" className={localStyles.input} />
                        </div>
                        <button className={localStyles.saveBtn}>Save Changes</button>
                    </div>

                    <div className={`glass-panel ${localStyles.settingsGroup}`}>
                        <h2>Categories</h2>
                        <p className={localStyles.description}>Manage tags for your transactions.</p>
                        <ul className={localStyles.categoryList}>
                            <li>
                                <div className={localStyles.catItem}>
                                    <div className={localStyles.colorPreview} style={{ backgroundColor: 'var(--success)' }}></div>
                                    <span>Income</span>
                                    <button className={localStyles.deleteBtn}>×</button>
                                </div>
                            </li>
                            <li>
                                <div className={localStyles.catItem}>
                                    <div className={localStyles.colorPreview} style={{ backgroundColor: 'var(--danger)' }}></div>
                                    <span>Food</span>
                                    <button className={localStyles.deleteBtn}>×</button>
                                </div>
                            </li>
                            <li>
                                <div className={localStyles.catItem}>
                                    <div className={localStyles.colorPreview} style={{ backgroundColor: 'var(--warning)' }}></div>
                                    <span>Entertainment</span>
                                    <button className={localStyles.deleteBtn}>×</button>
                                </div>
                            </li>
                            <li>
                                <div className={localStyles.catItem}>
                                    <div className={localStyles.colorPreview} style={{ backgroundColor: 'var(--accent-primary)' }}></div>
                                    <span>Utilities</span>
                                    <button className={localStyles.deleteBtn}>×</button>
                                </div>
                            </li>
                        </ul>
                        <div className={localStyles.addCategory}>
                            <input type="text" placeholder="New category name" className={localStyles.input} />
                            <button className={localStyles.saveBtn}>Add</button>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
