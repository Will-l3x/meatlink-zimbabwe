import styles from "./page.module.css";
import Button from "@/components/ui/Button";

const STEPS = [
  { icon: '💳', title: 'Fund Your Wallet', description: "Top up your Wallet Balance via Stripe, Payfast, or SA Bank Transfer if you're in the Diaspora." },
  { icon: '🥩', title: 'Choose a Hamper', description: 'Select from our curated Gogo, Family, or Braai packs. Subscriptions deduct automatically.' },
  { icon: '🚚', title: 'Weekly Delivery', description: 'We deliver fresh cuts every week to your recipient in Harare, ensuring food security despite power cuts.' },
  { icon: '📸', title: 'Proof of Love', description: 'Receive a photo of your family with their delivery. Total peace of mind for you, fresh meat for them.' }
];

const TRUST_STATS = [
  { value: '2,400+', label: 'Families Fed' },
  { value: '98%', label: 'On-Time Delivery' },
  { value: '12', label: 'Harare Suburbs' },
  { value: '4.9★', label: 'Customer Rating' }
];

export default function Home() {
  return (
    <div className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.heroBadge}>🇿🇼 Trusted by the Diaspora since 2024</div>
        <h1>Send Home the Taste of Love</h1>
        <p>Premium meat hampers delivered weekly to your family in Harare. Secure, reliable, and fresh.</p>
        <div className={styles.ctaGroup}>
          <Button href="/shop">Send a Meat Pack</Button>
          <Button variant="secondary" href="/dashboard">View Dashboard</Button>
        </div>
      </section>

      {/* Trust Stats Bar */}
      <section className={styles.trustBar}>
        {TRUST_STATS.map((stat, i) => (
          <div key={i} className={styles.trustItem}>
            <div className={styles.trustValue}>{stat.value}</div>
            <div className={styles.trustLabel}>{stat.label}</div>
          </div>
        ))}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>How It Works</h2>
          <p>The journey from click to kitchen</p>
        </div>

        <div className={styles.grid}>
          {STEPS.map((step, i) => (
            <div key={i} className={styles.stepCard}>
              <div className={styles.stepIcon}>{step.icon}</div>
              <div className={styles.stepNumber}>{i + 1}</div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section} style={{ background: 'var(--secondary-light)', borderRadius: '24px' }}>
        <div className={styles.grid}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>The Wallet Balance</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: '1.6' }}>
              No more stressing about monthly payouts. Deposit once, and our system handles the weekly deductions and deliveries automatically.
              You can pause deliveries anytime if your family reports electricity issues.
            </p>
            <Button href="/top-up" variant="secondary" style={{ alignSelf: 'flex-start' }}>Fund Your Wallet</Button>
          </div>
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 'var(--radius)',
            padding: '3rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--card-shadow)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '0.5rem' }}>AVAILABLE BALANCE</div>
              <div style={{ fontSize: '4rem', fontWeight: '800', color: 'var(--primary)' }}>$120.00</div>
              <div style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'rgba(45, 106, 79, 0.08)', color: 'var(--success)', borderRadius: '50px', fontSize: '0.8rem', fontWeight: '600' }}>
                Next Delivery: Wednesday
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
