import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import styles from "./layout.module.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Personal Finance Dashboard",
  description: "Minimalist and premium finance tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <div className={styles.appContainer}>
          <aside className={styles.sidebar}>
            <div className={styles.brand}>
              <div className={styles.logoBadge}>F</div>
              <h2>Finance</h2>
            </div>
            <nav className={styles.nav}>
              <Link href="/" className={`${styles.navItem} ${styles.active}`}>
                Dashboard
              </Link>
              <Link href="/transactions" className={styles.navItem}>
                Transactions
              </Link>
              <Link href="/settings" className={styles.navItem}>
                Settings
              </Link>
            </nav>
            <div className={styles.userProfile}>
              <div className={styles.avatar}>D</div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>Degrayce</span>
                <span className={styles.userRole}>Pro User</span>
              </div>
            </div>
          </aside>
          <div className={styles.mainWrapper}>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
