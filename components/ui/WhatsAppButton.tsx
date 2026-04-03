"use client";

import React from 'react';

export default function WhatsAppButton() {
    // You can replace this number with the actual business WhatsApp number (format: country code + number without +, e.g., 263771234567)
    const phoneNumber = "263782154206"; 
    const message = encodeURIComponent("Hello! I need some help with MeatLink Zimbabwe.");
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

    return (
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
                position: 'fixed',
                bottom: '2rem',
                right: '2rem',
                backgroundColor: '#25D366',
                color: 'white',
                borderRadius: '50%',
                width: '60px',
                height: '60px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.4)',
                cursor: 'pointer',
                zIndex: 50,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 211, 102, 0.5)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 211, 102, 0.4)';
            }}
            aria-label="Contact us on WhatsApp"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
        </a>
    );
}
