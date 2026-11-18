"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import WhatsAppIcon from './WhatsAppIcon';
import { whatsappLink } from '@/lib/contact';
import styles from './WhatsAppButton.module.css';

export default function WhatsAppButton() {
    const pathname = usePathname();
    // The admin console has its own bottom tab bar on mobile; keep it clear.
    if (pathname?.startsWith('/admin')) return null;

    return (
        <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.fab}
            aria-label="Chat with us on WhatsApp"
        >
            <WhatsAppIcon size={30} />
        </a>
    );
}
