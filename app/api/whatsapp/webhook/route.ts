import { NextResponse } from 'next/server';
import { chatbotService } from '@/lib/chatbot';

/**
 * WhatsApp Webhook Handler (Meta Cloud API)
 */

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('hub.mode');
        const token = searchParams.get('hub.verify_token');
        const challenge = searchParams.get('hub.challenge');

        // Diagnostic mode: check if env vars are set
        if (searchParams.get('diag') === '1') {
            return NextResponse.json({
                token_set: !!process.env.WHATSAPP_TOKEN,
                token_length: process.env.WHATSAPP_TOKEN?.length || 0,
                phone_id_set: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
                phone_id: process.env.WHATSAPP_PHONE_NUMBER_ID || 'NOT SET',
                verify_token: process.env.WHATSAPP_VERIFY_TOKEN || 'NOT SET',
                db_url_set: !!process.env.DATABASE_URL,
            });
        }

        console.log(`[Webhook] Verify: mode=${mode}, token=${token}, challenge=${challenge}`);

        const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'hexad_market_verification';

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
            } catch (botError: any) {
                console.error(`[Webhook] ❌ Bot error:`, botError.message, botError.stack);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Webhook] ❌ POST error:', error.message, error.stack);
        // Always return 200 to prevent Meta from retrying
        return NextResponse.json({ success: false, error: error.message }, { status: 200 });
    }
}
