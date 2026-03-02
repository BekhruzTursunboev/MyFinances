'use client';

import { useState } from 'react';
import { deleteTransaction } from '@/lib/actions';
import { useRouter } from 'next/navigation';

export default function DeleteButton({ id }: { id: string }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm('Rostdan ham ushbu tranzaksiyani o\'chirmoqchimisiz?')) return;

        setIsDeleting(true);
        await deleteTransaction(id);
        setIsDeleting(false);
        // Option to router.refresh directly if revalidatePath isn't reflecting client side immediately
        router.refresh();
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--danger)',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                opacity: isDeleting ? 0.5 : 1,
                transition: 'all var(--transition-fast)',
                fontWeight: 500
            }}
            onMouseOver={(e) => {
                if (!isDeleting) e.currentTarget.style.background = 'rgba(229, 72, 77, 0.1)';
            }}
            onMouseOut={(e) => {
                if (!isDeleting) e.currentTarget.style.background = 'transparent';
            }}
        >
            {isDeleting ? 'O\'chirilmoqda...' : 'O\'chirish'}
        </button>
    );
}
