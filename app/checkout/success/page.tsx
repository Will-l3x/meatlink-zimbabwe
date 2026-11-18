import { redirect } from 'next/navigation';

// Payment results are shown on /checkout/zb-return, which verifies the
// payment with ZB. This old static page is kept only as a redirect.
export default function CheckoutSuccessPage() {
    redirect('/dashboard');
}
