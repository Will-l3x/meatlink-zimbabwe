import { NextResponse } from 'next/server';
import { chatbotService } from '@/lib/chatbot';
import { getPrisma } from '@/lib/prisma';

/**
 * WhatsApp Webhook Handler (Meta Cloud API)
 */

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('hub.mode');
        const token = searchParams.get('hub.verify_token');
        const challenge = searchParams.get('hub.challenge');

        const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'hexad_market_verification';

        // Diagnostic mode (requires the verify token): check if env vars are set
        if (searchParams.get('diag') === '1') {
            if (searchParams.get('token') !== VERIFY_TOKEN) {
                return new Response('Forbidden', { status: 403 });
            }
            const dbUrl = process.env.DATABASE_URL || '';
            let dbHost = '';
            const hostMatch = dbUrl.match(/mongodb(?:\+srv)?:\/\/[^@]+@([^/?]+)/);
            if (hostMatch) dbHost = hostMatch[1];
            else if (dbUrl) dbHost = 'unparseable';

            let dbReachable = false;
            let dbError: string | undefined;
            const db = getPrisma();
            if (db) {
                try {
                    await db.$runCommandRaw({ ping: 1 });
                    dbReachable = true;
                } catch (e) {
                    dbError = e instanceof Error ? e.message.split('\n')[0] : String(e);
                }
            } else {
                dbError = 'DATABASE_URL not configured';
            }

            return NextResponse.json({
                token_set: !!process.env.WHATSAPP_TOKEN,
                token_length: process.env.WHATSAPP_TOKEN?.length || 0,
                phone_id_set: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
                db_url_set: !!process.env.DATABASE_URL,
                db_host: dbHost,
                db_reachable: dbReachable,
                db_error: dbError,
            });
        }

        console.log(`[Webhook] Verify: mode=${mode}, challenge=${challenge}`);

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('[Webhook] ✅ Verified');
            return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
        }

        return new Response('Verification failed', { status: 403 });
    } catch (error) {
        console.error('[Webhook] Verify error:', error);
        return new Response('Error', { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        if (!value?.messages?.[0]) {
            // Meta reports undelivered messages here (e.g. error 131047 when the
            // number hasn't messaged us in the last 24 hours), so log failures.
            for (const st of value?.statuses || []) {
                if (st?.status === 'failed') {
                    const err = st.errors?.[0];
                    console.error(`[Webhook] ❌ Message to ${st.recipient_id} failed: ${err?.code} ${err?.title || ''} ${err?.error_data?.details || ''}`.trim());
                }
            }
            console.log('[Webhook] Non-message event (status update etc.)');
            return NextResponse.json({ success: true });
        }

        const message = value.messages[0];
        const from = message.from;
        const contact = value.contacts?.[0]?.profile?.name || 'Customer';

        let text = '';
        let payload = '';

        if (message.type === 'text') {
            text = message.text.body;
        } else if (message.type === 'interactive') {
            const interactive = message.interactive;
            if (interactive.type === 'button_reply') {
                payload = interactive.button_reply.id;
                text = interactive.button_reply.title;
            } else if (interactive.type === 'list_reply') {
                payload = interactive.list_reply.id;
                text = interactive.list_reply.title;
            }
        }

        if (text || payload) {
            console.log(`[Webhook] 📩 From ${from} (${contact}): "${text}" payload="${payload}"`);
            
            try {
                await chatbotService.handleMessage(from, text, payload, contact);
                console.log(`[Webhook] ✅ Message processed successfully`);
            } catch (botError: unknown) {
                const err = botError instanceof Error ? botError : new Error(String(botError));
                console.error(`[Webhook] ❌ Bot error:`, err.message, err.stack);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('[Webhook] ❌ POST error:', err.message, err.stack);
        // Always return 200 to prevent Meta from retrying
        return NextResponse.json({ success: false, error: err.message }, { status: 200 });
    }
}
