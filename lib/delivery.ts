/** Harare suburbs we deliver to. Shared by checkout, the WhatsApp bot and /delivery-areas. */
export const SUBURBS = [
    'Avondale', 'Borrowdale', 'Budiriro', 'Chitungwiza', 'Glen Lorne', 'Greendale',
    'Harare CBD', 'Highlands', 'Kuwadzana', 'Mabelreign', 'Mbare', 'Mount Pleasant',
    'Msasa', 'Newlands', 'Tynwald', 'Waterfalls', 'Westgate', 'Zimre Park'
];

/** Weekly deliveries bought with one payment on the "weekly, paid monthly" plan. */
export const PLAN_WEEKS = 4;

/** Next Wednesday at 09:00 server time (deliveries run on Wednesdays). */
export function nextDeliveryDate(from: Date = new Date()): Date {
    const daysUntilWednesday = (3 - from.getDay() + 7) % 7 || 7;
    const next = new Date(from);
    next.setDate(from.getDate() + daysUntilWednesday);
    next.setHours(9, 0, 0, 0);
    return next;
}
