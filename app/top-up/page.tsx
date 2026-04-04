import { redirect } from 'next/navigation';

// The wallet top-up flow has been removed.
// Users are directed to the shop for direct purchases.
export default function TopUpPage() {
    redirect('/shop');
}
