/**
 * The price list: the single source of truth for every cut's price per kg.
 * Used by the shop, checkout and WhatsApp bot for display, and by the server
 * to work out what an order costs (the browser's total is never trusted).
 * Change prices here only.
 */

export type Currency = 'USD' | 'ZAR' | 'GBP';
export interface CutPricing { usd: number; zar: number; gbp: number }
export interface CatalogCut { title: string; pricing: CutPricing }

export const CATALOG: Record<string, CatalogCut> = {
    'pork-chops': { title: 'Pork Chops', pricing: { usd: 5.45, zar: 101, gbp: 4.30 } },
    'pork-trotters': { title: 'Pork Trotters', pricing: { usd: 3.75, zar: 69, gbp: 2.96 } },
    'pork-shoulder': { title: 'Pork Shoulder', pricing: { usd: 5.00, zar: 93, gbp: 3.95 } },
    'pork-belly': { title: 'Pork Belly', pricing: { usd: 6.00, zar: 111, gbp: 4.74 } },
    'pork-ribs': { title: 'Pork Ribs', pricing: { usd: 5.00, zar: 93, gbp: 3.95 } },
    't-bone-steak': { title: 'T-Bone Steak', pricing: { usd: 7.20, zar: 133, gbp: 5.69 } },
    'blade': { title: 'Blade', pricing: { usd: 6.55, zar: 121, gbp: 5.17 } },
    'brisket': { title: 'Brisket', pricing: { usd: 6.00, zar: 111, gbp: 4.74 } },
    'full-chicken': { title: 'Full Chicken', pricing: { usd: 6.89, zar: 127, gbp: 5.44 } },
    'chicken-breast': { title: 'Chicken Breast', pricing: { usd: 4.62, zar: 85, gbp: 3.65 } },
    'mixed-portions': { title: 'Mixed Portions', pricing: { usd: 5.00, zar: 93, gbp: 3.95 } },
    'oxtail': { title: 'Oxtail', pricing: { usd: 12.86, zar: 238, gbp: 10.16 } },
    'beef-short-ribs': { title: 'Beef Short Ribs', pricing: { usd: 6.00, zar: 111, gbp: 4.74 } },
    'beef-trotters': { title: 'Beef Trotters', pricing: { usd: 4.50, zar: 83, gbp: 3.56 } },
    'liver': { title: 'Liver', pricing: { usd: 7.50, zar: 139, gbp: 5.93 } },
    'goat-meat': { title: 'Goat Meat', pricing: { usd: 6.92, zar: 128, gbp: 5.47 } },
};

/** Weight limits per line, in kg. Whole or half kilograms only. */
export const MIN_LINE_KG = 1;
export const MAX_LINE_KG = 50;

export function pricePerKg(id: string, currency: Currency): number | null {
    const cut = CATALOG[id];
    if (!cut) return null;
    return currency === 'ZAR' ? cut.pricing.zar : currency === 'GBP' ? cut.pricing.gbp : cut.pricing.usd;
}

export interface PricedLine { id: string; title: string; kg: number; price: number; lineTotal: number }

export type PricedCart =
    /** total = exact sum of price × kg, unrounded; round after any multiplier. */
    | { ok: true; lines: PricedLine[]; total: number }
    | { ok: false; error: string };

/**
 * Price a cart from the catalogue. Accepts only known cut ids and sensible
 * weights; titles and prices sent by the browser are ignored.
 */
export function priceCart(raw: unknown, currency: Currency): PricedCart {
    if (!Array.isArray(raw) || raw.length === 0) return { ok: false, error: 'Your cart is empty.' };
    if (raw.length > 30) return { ok: false, error: 'Too many items in the cart.' };

    const byId = new Map<string, number>();
    for (const entry of raw) {
        const id = typeof entry?.id === 'string' ? entry.id : '';
        const kg = Number(entry?.kg);
        if (!CATALOG[id]) return { ok: false, error: 'An item in your cart is no longer available. Please remove it and try again.' };
        if (!Number.isFinite(kg) || kg <= 0 || !Number.isInteger(kg * 2)) {
            return { ok: false, error: 'Please choose a whole or half kilogram for each item.' };
        }
        byId.set(id, (byId.get(id) ?? 0) + kg);
    }

    const lines: PricedLine[] = [];
    for (const [id, kg] of byId) {
        if (kg < MIN_LINE_KG || kg > MAX_LINE_KG) {
            return { ok: false, error: `Each item must be between ${MIN_LINE_KG} and ${MAX_LINE_KG} kg.` };
        }
        const price = pricePerKg(id, currency)!;
        lines.push({ id, title: CATALOG[id].title, kg, price, lineTotal: price * kg });
    }
    const total = lines.reduce((s, l) => s + l.lineTotal, 0);
    return { ok: true, lines, total };
}
