import { redirect } from 'next/navigation';

// This screen used hard-coded demo data. The live admin console at /admin
// covers orders, users, subscriptions and finances from the database.
export default function LegacyAdminPage() {
    redirect('/admin');
}
