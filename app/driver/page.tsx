import styles from './page.module.css';

export default function DriverPage() {
    const deliveries = [
        { name: "Mrs. Moyo", address: "123 Samora Machel Ave", time: "10:30 AM" },
        { name: "Mr. Chikomo", address: "54 Borrowdale Rd", time: "11:15 AM" },
        { name: "S. Nyoni", address: "Mabelreign Shopping Centre", time: "12:00 PM" },
    ];

    return (
        <div className={styles.mobileContainer}>
            <div className={styles.mapPlaceholder}>
                <div className={styles.routeLine} />
                <span style={{ zIndex: 1 }}>Harare Route Map</span>
            </div>

            <div className={styles.onRoute}>
                <div>
                    <h2>On Route</h2>
                    <p style={{ fontSize: '0.8rem', opacity: 0.5 }}>Active Deliveries: 3</p>
                </div>
                <div style={{ width: '40px', height: '24px', background: 'var(--primary)', borderRadius: '12px', position: 'relative' }}>
                    <div style={{ width: '20px', height: '20px', background: '#fff', borderRadius: '100%', position: 'absolute', right: '2px', top: '2px' }} />
                </div>
            </div>

            <div className={styles.deliveryList}>
                {deliveries.map((d, i) => (
                    <div key={i} className={styles.deliveryCard}>
                        <div className={styles.info}>
                            <h4>{d.name}</h4>
                            <p>{d.address}</p>
                        </div>
                        <div className={styles.time}>{d.time}</div>
                    </div>
                ))}
            </div>

            <div className={styles.fab}>
                <span>QR SCAN</span>
            </div>
        </div>
    );
}
