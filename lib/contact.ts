/** Business contact details shown across the site. */
export const SUPPORT_WHATSAPP = '263774402370';
export const SUPPORT_WHATSAPP_DISPLAY = '+263 77 440 2370';

export function whatsappLink(message = 'Hello! I need help with my Hexad Market order.'): string {
    return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;
}
