import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5050';

export async function GET(_req: NextRequest) {
    const { getToken } = auth();
    const token = await getToken();

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const response = await fetch(`${apiBase}/api/integrations/webhooks`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: response.status });
    const data = await response.json();
    return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
    const { getToken } = auth();
    const token = await getToken();
    const body = await req.json();

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const response = await fetch(`${apiBase}/api/integrations/webhooks`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) return NextResponse.json({ error: 'Failed to create webhook' }, { status: response.status });
    const data = await response.json();
    return NextResponse.json(data);
}
