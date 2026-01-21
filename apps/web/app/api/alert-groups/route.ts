import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:5050';
    const searchParams = req.nextUrl.searchParams.toString();

    try {
        const res = await fetch(`${API_BASE}/api/alert-groups?${searchParams}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error('Backend Alert Groups Error:', res.status, errorText);
            try {
                return NextResponse.json(JSON.parse(errorText), { status: res.status });
            } catch {
                return NextResponse.json({ error: errorText || res.statusText }, { status: res.status });
            }
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (err) {
        console.error('Alert groups API error:', err);
        return NextResponse.json({ error: 'Failed to fetch alert groups' }, { status: 500 });
    }
}
