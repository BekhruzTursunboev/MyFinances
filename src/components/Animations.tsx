'use client';

import { motion } from 'framer-motion';

export function FadeIn({ children, delay = 0, y = 20 }: { children: React.ReactNode, delay?: number, y?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: y }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: delay, ease: [0.16, 1, 0.3, 1] }} // Apple-like spring cubic bezier
        >
            {children}
        </motion.div>
    );
}

export function StaggerContainer({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={{
                hidden: { opacity: 0 },
                visible: {
                    opacity: 1,
                    transition: {
                        staggerChildren: 0.1
                    }
                }
            }}
        >
            {children}
        </motion.div>
    );
}

export function StaggerItem({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
            }}
        >
            {children}
        </motion.div>
    );
}
