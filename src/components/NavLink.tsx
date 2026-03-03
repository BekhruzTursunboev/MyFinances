'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '../app/layout.module.css';

export default function NavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
    const pathname = usePathname();
    const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

    return (
        <Link
            href={href}
            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
        >
            <span className={styles.icon}>{icon}</span>
            {label}
        </Link>
    );
}
