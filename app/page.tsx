import styles from "./page.module.css";
import Button from "@/components/ui/Button";

export default function Home() {
  return (
    <div className={styles.main}>
      <section className={styles.hero}>
        <h1>Send Home the Taste of Love</h1>
        <p>Premium meat hampers delivered weekly to your family in Harare. Secure, reliable, and fresh.</p>
        <div className={styles.ctaGroup}>
          <Button href="/shop">Send a Meat Pack</Button>
          <Button variant="secondary" href="/dashboard">View Dashboard</Button>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>How It Works</h2>
          <p>The journey from click to kitchen</p>
        </div>

        <div className={styles.grid}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>1</div>
            <h3>Fund Your Wallet</h3>
            <p>Top up your Wallet Balance via Stripe, Payfast, or SA Bank Transfer if you're in the Diaspora.</p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>2</div>
            <h3>Choose a Hamper</h3>
            <p>Select from our curated Gogo, Family, or Braai packs. Subscriptions deduct automatically.</p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>3</div>
            <h3>Weekly Delivery</h3>
            <p>We deliver fresh cuts every week to your recipient in Harare, ensuring food security despite power cuts.</p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>4</div>
            <h3>Proof of Love</h3>
            <p>Receive a photo of your family with their delivery. Total peace of mind for you, fresh meat for them.</p>
          </div>
        </div>
      </section>

      <section className={styles.section} style={{ background: 'rgba(212, 175, 55, 0.02)', borderRadius: '24px' }}>
        <div className={styles.grid}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>The Wallet Balance</h2>
            <p style={{ color: 'rgba(237, 237, 237, 0.7)', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: '1.6' }}>
              No more stressing about monthly payouts. Deposit once, and our system handles the weekly deductions and deliveries automatically.
              You can pause deliveries anytime if your family reports electricity issues.
            </p>
            <Button href="/dashboard" variant="secondary" style={{ alignSelf: 'flex-start' }}>Learn More</Button>
          </div>
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 'var(--radius)',
            padding: '3rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Visual representation of a card/wallet could go here */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>AVAILABLE BALANCE</div>
              <div style={{ fontSize: '4rem', fontWeight: '800', color: 'var(--primary)' }}>$120.00</div>
              <div style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'rgba(46, 125, 50, 0.1)', color: '#4caf50', borderRadius: '50px', fontSize: '0.8rem' }}>
                Next Delivery: Wednesday
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
