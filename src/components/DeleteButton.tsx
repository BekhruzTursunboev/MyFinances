'use client';

import { useState, useTransition } from 'react';
import { deleteTransaction } from '@/lib/actions';
import { useRouter } from 'next/navigation';

export default function DeleteButton({ id }: { id: string }) {
    const [isPending, startTransition] = useTransition();
    const [isOptimisticallyDeleted, setIsOptimisticallyDeleted] = useState(false);
    const router = useRouter();

    const handleDelete = () => {
        if (!confirm('Rostdan ham ushbu tranzaksiyani o\'chirmoqchimisiz?')) return;

        setIsOptimisticallyDeleted(true);

        startTransition(async () => {
            await deleteTransaction(id);
            router.refresh();
        });
    };

    if (isOptimisticallyDeleted) return <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>O'chirilmoqda...</span>

    return (
        <button
            onClick={handleDelete}
            disabled={isPending}
            style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--danger)',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.5 : 1,
                transition: 'all var(--transition-fast)',
                fontWeight: 500
            }}
            onMouseOver={(e) => {
                if (!isPending) e.currentTarget.style.background = 'rgba(229, 72, 77, 0.1)';
            }}
            onMouseOut={(e) => {
                if (!isPending) e.currentTarget.style.background = 'transparent';
            }}
        >
            O'chirish
        </button>
    );
}
