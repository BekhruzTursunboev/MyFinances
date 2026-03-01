import { NextResponse } from 'next/server';
import { bot } from '@/lib/bot';

// Prevent Next.js from trying to statically generate this route during `next build`
// because it requires environment variables that only exist at runtime in Vercel.
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Process the Telegram update
        await bot.handleUpdate(body);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ message: 'Telegram Webhook API is running' });
}
