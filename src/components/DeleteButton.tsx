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

    if (isOptimisticallyDeleted) {
        return (
            <span style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                fontStyle: 'italic'
            }}>
                O'chirilmoqda...
            </span>
        );
    }

    return (
        <button
            onClick={handleDelete}
            disabled={isPending}
            style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                padding: '0.3rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.5 : 1,
                transition: 'all var(--transition-fast)',
                fontWeight: 500,
                fontFamily: 'inherit'
            }}
            onMouseOver={(e) => {
                if (!isPending) {
                    e.currentTarget.style.background = 'var(--danger-muted)';
                    e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.3)';
                    e.currentTarget.style.color = 'var(--danger)';
                }
            }}
            onMouseOut={(e) => {
                if (!isPending) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.color = 'var(--text-muted)';
                }
            }}
        >
            O'chirish
        </button>
    );
}
