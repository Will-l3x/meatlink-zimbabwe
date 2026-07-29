import styles from "./page.module.css";
import Button from "@/components/ui/Button";
import Link from "next/link";

const CATEGORIES = [
  {
    slug: "beef",
    name: "Beef",
    blurb: "Steaks, slow-cook cuts & braai favourites",
    image: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=800&h=600&fit=crop&q=80",
  },
  {
    slug: "pork",
    name: "Pork",
    blurb: "Chops, belly, ribs & traditional cuts",
    image: "https://images.unsplash.com/photo-1432139509613-5c4255a1d128?w=800&h=600&fit=crop&q=80",
  },
  {
    slug: "poultry",
    name: "Poultry",
    blurb: "Whole birds, breast & mixed portions",
    image: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=800&h=600&fit=crop&q=80",
  },
  {
    slug: "premium",
    name: "Premium",
    blurb: "Oxtail & occasion cuts",
    image: "https://images.unsplash.com/photo-1558030006-450675393462?w=800&h=600&fit=crop&q=80",
  },
];

const FEATURED = [
  {
    name: "T-Bone Steak",
    tag: "Beef",
    price: "$7.20/kg",
    image: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600&h=450&fit=crop&q=80",
  },
  {
    name: "Oxtail",
    tag: "Premium",
    price: "$12.86/kg",
    image: "https://images.unsplash.com/photo-1558030006-450675393462?w=600&h=450&fit=crop&q=80",
  },
  {
    name: "Pork Belly",
    tag: "Pork",
    price: "$6.00/kg",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=450&fit=crop&q=80",
  },
  {
    name: "Full Chicken",
    tag: "Poultry",
    price: "$6.89/kg",
    image: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=600&h=450&fit=crop&q=80",
  },
];

const STEPS = [
  {
    title: "Choose your cuts",
    description: "Browse by category — pick the weight you need, per kilogram.",
  },
  {
    title: "Tell us who receives it",
    description: "Add delivery details for your family in Harare.",
  },
  {
    title: "Pay securely",
    description: "Ecocash, InnBucks, Visa, Mastercard & Zimswitch via ZB Smile & Pay.",
  },
  {
    title: "Weekly delivery",
    description: "Fresh cuts on schedule, with proof of delivery for peace of mind.",
  },
];

export default function Home() {
  return (
    <div className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.heroMedia} aria-hidden>
          <img
            src="https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=1600&h=900&fit=crop&q=80"
            alt=""
            className={styles.heroImage}
          />
          <div className={styles.heroOverlay} />
        </div>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>Harare · Weekly delivery · Since 2024</p>
          <h1>
            Your neighbourhood butcher,
            <br />
            <span className={styles.heroAccent}>delivered to their door.</span>
          </h1>
          <p className={styles.heroLead}>
            Premium beef, pork, poultry & specialty cuts — ordered online from anywhere in the world,
            prepared with care, delivered to family in Harare.
          </p>
          <div className={styles.ctaGroup}>
            <Button href="/shop">Order premium cuts</Button>
            <Button variant="secondary" href="/register">
              Create free account
            </Button>
          </div>
        </div>
      </section>

      <section className={styles.trustStrip}>
        <div className={styles.trustInner}>
          <div><strong>2,400+</strong> families fed</div>
          <div><strong>98%</strong> on-time delivery</div>
          <div><strong>12</strong> Harare suburbs</div>
          <div><strong>4.9★</strong> customer rating</div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Shop by category</p>
          <h2>Cut with intention</h2>
          <p>Like a traditional counter — organised the way you actually shop for meat.</p>
        </div>
        <div className={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <Link key={cat.slug} href={`/shop?category=${cat.slug}`} className={styles.categoryCard}>
              <img src={cat.image} alt="" className={styles.categoryImage} />
              <div className={styles.categoryBody}>
                <h3>{cat.name}</h3>
                <p>{cat.blurb}</p>
                <span className={styles.categoryLink}>Shop {cat.name.toLowerCase()} →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Butcher&apos;s picks</p>
          <h2>Customer favourites</h2>
        </div>
        <div className={styles.productGrid}>
          {FEATURED.map((item) => (
            <article key={item.name} className={styles.productCard}>
              <div className={styles.productImageWrap}>
                <img src={item.image} alt={item.name} className={styles.productImage} />
                <span className={styles.productTag}>{item.tag}</span>
              </div>
              <div className={styles.productBody}>
                <h3>{item.name}</h3>
                <p className={styles.productPrice}>{item.price}</p>
              </div>
            </article>
          ))}
        </div>
        <div className={styles.sectionCta}>
          <Button href="/shop">View full catalog</Button>
        </div>
      </section>

      <section className={styles.story}>
        <div className={styles.storyGrid}>
          <div className={styles.storyCopy}>
            <p className={styles.eyebrow}>Our promise</p>
            <h2>From farm gate to family table</h2>
            <p>
              Hexad Market exists so diaspora families can send more than money home — you send nourishment,
              tradition, and Sunday lunch. Every order is traceable, every delivery is photographed, and every
              cut is chosen for freshness.
            </p>
            <ul className={styles.storyList}>
              <li>Hand-selected cuts, sold by the kilogram</li>
              <li>Free delivery across Harare suburbs</li>
              <li>Order on web or WhatsApp</li>
            </ul>
          </div>
          <div className={styles.storyVisual}>
            <img
              src="https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&h=1000&fit=crop&q=80"
              alt="Fresh meat preparation"
              className={styles.storyImage}
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>How it works</p>
          <h2>Four steps to feed home</h2>
        </div>
        <ol className={styles.steps}>
          {STEPS.map((step, i) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.stepNum}>{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.ctaBanner}>
        <div className={styles.ctaBannerInner}>
          <h2>Ready to send something special?</h2>
          <p>Join families across the diaspora who keep their loved ones fed with Hexad Market.</p>
          <Button href="/shop">Start your order</Button>
        </div>
      </section>
    </div>
  );
}
