/** Business contact details shown across the site. */
export const SUPPORT_WHATSAPP = '263782154206';
export const SUPPORT_WHATSAPP_DISPLAY = '+263 78 215 4206';

export function whatsappLink(message = 'Hello! I need help with my Hexad Market order.'): string {
    return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;
}
