/** Harare suburbs we deliver to. Shared by checkout, the WhatsApp bot and /delivery-areas. */
export const SUBURBS = [
    'Avondale', 'Borrowdale', 'Budiriro', 'Chitungwiza', 'Glen Lorne', 'Greendale',
    'Harare CBD', 'Highlands', 'Kuwadzana', 'Mabelreign', 'Mbare', 'Mount Pleasant',
    'Msasa', 'Newlands', 'Tynwald', 'Waterfalls', 'Westgate', 'Zimre Park'
];

/**
 * Prepaid plans: the customer pays once per 4-week cycle and chooses how
 * often the order is delivered within it. Deliveries stay on Wednesdays, so
 * "monthly" means every 4th Wednesday (13 deliveries a year, not 12).
 */
export type PlanFrequency = 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY';

/** Length of one paid cycle. */
export const PLAN_CYCLE_WEEKS = 4;

export const PLAN_FREQUENCIES: Record<PlanFrequency, {
    /** Deliveries paid for by one payment. */
    deliveries: number;
    /** Days between deliveries. */
    intervalDays: number;
    /** "Weekly", for buttons and badges. */
    label: string;
    /** "every Wednesday", to finish a sentence. */
    cadence: string;
}> = {
    WEEKLY: { deliveries: 4, intervalDays: 7, label: 'Weekly', cadence: 'every Wednesday' },
    BI_WEEKLY: { deliveries: 2, intervalDays: 14, label: 'Every 2 weeks', cadence: 'every second Wednesday' },
    MONTHLY: { deliveries: 1, intervalDays: 28, label: 'Monthly', cadence: 'every 4th Wednesday' },
};

/** Read a stored or submitted frequency; plans made before the choice existed are weekly. */
export function planFrequency(value: unknown): PlanFrequency {
    return value === 'BI_WEEKLY' || value === 'MONTHLY' ? value : 'WEEKLY';
}

/** "4 weekly deliveries", "2 deliveries, every 2 weeks", "1 monthly delivery". */
export function planDeliveriesLabel(freq: PlanFrequency, count = PLAN_FREQUENCIES[freq].deliveries): string {
    if (freq === 'WEEKLY') return `${count} weekly deliver${count === 1 ? 'y' : 'ies'}`;
    if (freq === 'MONTHLY') return `${count} monthly deliver${count === 1 ? 'y' : 'ies'}`;
    return `${count} deliver${count === 1 ? 'y' : 'ies'}, every 2 weeks`;
}

/** Next Wednesday at 09:00 server time (deliveries run on Wednesdays). */
export function nextDeliveryDate(from: Date = new Date()): Date {
    const daysUntilWednesday = (3 - from.getDay() + 7) % 7 || 7;
    const next = new Date(from);
    next.setDate(from.getDate() + daysUntilWednesday);
    next.setHours(9, 0, 0, 0);
    return next;
}
