import { NextResponse } from 'next/server';
import { resolveBaseUrl } from '@/lib/payment-initiation';
import { publicBaseUrl, runPlanScheduler } from '@/lib/plans';

export const dynamic = 'force-dynamic';

/**
 * Daily Vercel cron (see vercel.json): schedules the next paid delivery of
 * every weekly plan and sends renewal links when a plan's balance runs out.
 * Vercel sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set.
 */
export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        return NextResponse.json({ success: false, error: 'CRON_SECRET is not configured' }, { status: 503 });
    }
    if (request.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const result = await runPlanScheduler(publicBaseUrl(resolveBaseUrl(request)));
    return NextResponse.json({ success: true, ...result });
}
