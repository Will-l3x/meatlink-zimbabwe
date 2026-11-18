import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function NotFound() {
    return (
        <section style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5rem var(--spacing)', textAlign: 'center' }}>
            <div style={{ maxWidth: 480 }}>
                <p className="eyebrow">Error 404</p>
                <h1 style={{ margin: '0.5rem 0 1rem' }}>That cut isn&apos;t on the counter</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                    The page you&apos;re looking for has moved or never existed. Let&apos;s get you back to the good stuff.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Button href="/shop">Browse cuts</Button>
                    <Button href="/" variant="secondary">Go home</Button>
                </div>
                <p style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
                    <Link href="/faq" style={{ color: 'var(--primary)', fontWeight: 600 }}>Read the FAQ</Link>
                </p>
            </div>
        </section>
    );
}
