'use client';

import { useState, useTransition } from 'react';
import { addCategory, deleteCategory } from '@/lib/actions';
import styles from '@/app/settings/settings.module.css';

type Category = {
    id: string;
    name: string;
    type: 'income' | 'expense' | 'savings';
    color: string;
};

export default function CategoryManager({ categories: initialCategories }: { categories: Category[] }) {
    const [categories, setCategories] = useState(initialCategories);
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState<'expense' | 'income' | 'savings'>('expense');
    const [isPending, startTransition] = useTransition();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    function handleAdd() {
        if (!newName.trim()) return;
        const name = newName.trim();
        setNewName('');

        startTransition(async () => {
            const result = await addCategory(name, newType);
            if (result?.success && result.category) {
                setCategories(prev => [...prev, result.category!]);
            }
        });
    }

    function handleDelete(id: string) {
        if (!confirm("Rostdan ham ushbu kategoriyani o'chirmoqchimisiz?")) return;
        setDeletingId(id);

        startTransition(async () => {
            const result = await deleteCategory(id);
            if (result?.success) {
                setCategories(prev => prev.filter(c => c.id !== id));
            }
            setDeletingId(null);
        });
    }

    const typeLabel = (type: string) => {
        switch (type) {
            case 'income': return 'Kirim';
            case 'savings': return "Jamg'arma";
            default: return 'Chiqim';
        }
    };

    return (
        <div className={styles.categoryList}>
            {categories.map(cat => (
                <div key={cat.id} className={`${styles.categoryItem} ${deletingId === cat.id ? styles.deleting : ''}`}>
                    <div className={styles.catInfo}>
                        <div className={styles.colorPreview} style={{ backgroundColor: cat.color }}></div>
                        <span className={styles.catName}>{cat.name}</span>
                        <span className={styles.catType}>{typeLabel(cat.type)}</span>
                    </div>
                    <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(cat.id)}
                        disabled={deletingId === cat.id}
                    >
                        {deletingId === cat.id ? '...' : "O'chirish"}
                    </button>
                </div>
            ))}

            <div className={styles.addCategory}>
                <input
                    type="text"
                    placeholder="Yangi kategoriya..."
                    className={styles.input}
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
                <select
                    className={styles.input}
                    style={{ width: 'auto' }}
                    value={newType}
                    onChange={e => setNewType(e.target.value as any)}
                >
                    <option value="expense">Chiqim</option>
                    <option value="income">Kirim</option>
                    <option value="savings">Jamg'arma</option>
                </select>
                <button className={styles.addBtn} onClick={handleAdd} disabled={isPending || !newName.trim()}>
                    {isPending ? '...' : "Qo'shish"}
                </button>
            </div>
        </div>
    );
}
