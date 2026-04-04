import styles from "./page.module.css";
import Button from "@/components/ui/Button";

const STEPS = [
  { icon: '🥩', title: 'Choose Your Cuts', description: 'Browse our premium selection of pork, beef, chicken, and specialty meats. Pick exactly how many kilograms you want.' },
  { icon: '💳', title: 'Secure Checkout', description: 'Pay instantly via ZB Smile & Pay — Ecocash, InnBucks, Visa, Mastercard, and Zimswitch all accepted.' },
  { icon: '🚚', title: 'Weekly Delivery', description: 'We deliver fresh cuts every week to your recipient in Harare, ensuring food security regardless of the situation.' },
  { icon: '📸', title: 'Proof of Love', description: 'Receive a photo of your family with their delivery. Total peace of mind for you, fresh meat for them.' }
];

const TRUST_STATS = [
  { value: '2,400+', label: 'Families Fed' },
  { value: '98%', label: 'On-Time Delivery' },
  { value: '12', label: 'Harare Suburbs' },
  { value: '4.9★', label: 'Customer Rating' }
];

const CUTS = [
  { emoji: '🥩', name: 'T-Bone Steak', tag: 'BEEF', price: '$7.20/kg' },
  { emoji: '🍖', name: 'Oxtail', tag: 'PREMIUM', price: '$12.86/kg' },
  { emoji: '🐓', name: 'Full Chicken', tag: 'POULTRY', price: '$6.89/kg' },
  { emoji: '🥓', name: 'Pork Belly', tag: 'PORK', price: '$6.00/kg' },
];

export default function Home() {
  return (
    <div className={styles.main}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>🇿🇼 Trusted by the Diaspora since 2024</div>
        <h1>Send Home the<br /><span className={styles.heroAccent}>Taste of Love</span></h1>
        <p>Premium meat hampers delivered weekly to your family in Harare. Fresh, reliable, and traceable — every time.</p>
        <div className={styles.ctaGroup}>
          <Button href="/shop">Shop Premium Cuts</Button>
          <Button variant="secondary" href="/dashboard">My Dashboard</Button>
        </div>
      </section>

      {/* ── Trust Stats ── */}
      <section className={styles.trustBar}>
        {TRUST_STATS.map((stat, i) => (
          <div key={i} className={styles.trustItem}>
            <div className={styles.trustValue}>{stat.value}</div>
            <div className={styles.trustLabel}>{stat.label}</div>
          </div>
        ))}
      </section>

      {/* ── Featured Cuts ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Fresh From the Farm</h2>
          <p>Select cuts, choose your weight, and we handle the rest</p>
        </div>
        <div className={styles.cutsGrid}>
          {CUTS.map((c, i) => (
            <div key={i} className={styles.cutCard}>
              <div className={styles.cutEmoji}>{c.emoji}</div>
              <div className={styles.cutTag}>{c.tag}</div>
              <h3 className={styles.cutName}>{c.name}</h3>
              <div className={styles.cutPrice}>{c.price}</div>
            </div>
          ))}
        </div>
        <div className={styles.sectionCta}>
          <Button href="/shop">View All Cuts →</Button>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>How It Works</h2>
          <p>From click to kitchen in four simple steps</p>
        </div>
        <div className={styles.stepsGrid}>
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

      {/* ── CTA Banner ── */}
      <section className={styles.ctaBanner}>
        <div className={styles.ctaBannerInner}>
          <h2>Ready to send something special?</h2>
          <p>Join thousands of families already using MeatLink Zimbabwe to keep their loved ones fed.</p>
          <Button href="/shop" style={{ marginTop: '1.5rem' }}>Start Your Order</Button>
        </div>
      </section>
    </div>
  );
}
