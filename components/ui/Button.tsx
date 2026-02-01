"use client";

import React from 'react';
import Link from 'next/link';
import styles from './Button.module.css';

interface ButtonProps {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary';
    href?: string;
    onClick?: () => void;
    className?: string;
    fullWidth?: boolean;
    style?: React.CSSProperties;
}

export default function Button({
    children,
    variant = 'primary',
    href,
    onClick,
    className = '',
    fullWidth = false,
    style
}: ButtonProps) {
    const rootClassName = `
    ${styles.button} 
    ${styles[variant]} 
    ${fullWidth ? styles.fullWidth : ''} 
    ${className}
  `.trim();

    if (href) {
        return (
            <Link href={href} className={rootClassName} style={style}>
                {children}
            </Link>
        );
    }

    return (
        <button className={rootClassName} onClick={onClick} style={style}>
            {children}
        </button>
    );
}
