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

        console.log(`[WhatsApp Webhook] Verification Request - Mode: ${mode}, Token: ${token}, Challenge: ${challenge}`);

        const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'hexad_market_verification';

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('[WhatsApp Webhook] ✅ Verification Successful');
            // Return the challenge as plain text (no JSON, no quotes)
            return new Response(challenge, {
                status: 200,
                headers: { 'Content-Type': 'text/plain' }
            });
        }

        console.warn('[WhatsApp Webhook] ❌ Verification Failed: Token mismatch or invalid mode');
        return new Response('Verification failed', { status: 403 });
    } catch (error) {
        console.error('[WhatsApp Webhook] Verification Error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log('[WhatsApp Webhook] Received:', JSON.stringify(body, null, 2));

        // Check if it's a message event
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        if (value?.messages?.[0]) {
            const message = value.messages[0];
            const from = message.from; // Phone number
            const contact = value.contacts?.[0]?.profile?.name || 'Customer';

            // Handle different message types
            let text = '';
            let payload = '';

            if (message.type === 'text') {
                text = message.text.body;
            } else if (message.type === 'interactive') {
                // Handle button replies or list selections
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
                console.log(`[WhatsApp Bot] Message from ${from}: "${text}" (Payload: ${payload})`);
                await chatbotService.handleMessage(from, text, payload, contact);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[WhatsApp Webhook] Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
