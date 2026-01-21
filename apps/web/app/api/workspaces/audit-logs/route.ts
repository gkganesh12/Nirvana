import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5050';

export async function GET(req: NextRequest) {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    try {
        const res = await fetch(`${API_URL}/api/audit-logs?limit=${limit}&offset=${offset}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {
            const error = await res.text();
            return NextResponse.json({ error }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (err) {
        console.error('Audit Logs GET error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
