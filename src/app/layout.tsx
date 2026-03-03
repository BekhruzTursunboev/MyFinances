import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import styles from "./layout.module.css";
import NavLink from "@/components/NavLink";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MyFinanceuz | Shaxsiy Moliyaviy Boshqaruv",
  description: "Xarajatlar, daromadlar va jamg'armalarni oson kuzatib yoruvchi shaxsiy moliyaviy admin panel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body className={outfit.className}>
        <div className={styles.appWrapper}>
          <aside className={styles.sidebar}>
            <div className={styles.brand}>
              <div className={styles.logo}>M<span>F</span></div>
              <h2>MyFinanceuz</h2>
            </div>

            <nav className={styles.nav}>
              <NavLink href="/" icon="📊" label="Bosh Sahifa" />
              <NavLink href="/transactions" icon="💸" label="Tarix" />
              <NavLink href="/settings" icon="⚙️" label="Sozlamalar" />
            </nav>

            <div className={styles.userProfile}>
              <div className={styles.avatar}>D</div>
              <div className={styles.userInfo}>
                <p className={styles.name}>Degrayce</p>
                <p className={styles.role}>Boshqaruvchi</p>
              </div>
            </div>
          </aside>
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
