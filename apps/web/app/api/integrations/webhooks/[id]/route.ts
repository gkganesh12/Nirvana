import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5050';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const { getToken } = auth();
    const token = await getToken();
    const body = await req.json();

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const response = await fetch(`${apiBase}/api/integrations/webhooks/${params.id}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) return NextResponse.json({ error: 'Failed to update webhook' }, { status: response.status });
    const data = await response.json();
    return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
    const { getToken } = auth();
    const token = await getToken();

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const response = await fetch(`${apiBase}/api/integrations/webhooks/${params.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return NextResponse.json({ error: 'Failed to delete webhook' }, { status: response.status });
    return NextResponse.json({ success: true });
}
