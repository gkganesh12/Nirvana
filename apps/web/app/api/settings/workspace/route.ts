import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(_req: NextRequest) {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:5050';

    try {
        const res = await fetch(`${apiUrl}/api/settings/workspace`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {
            // Return 404 as null or empty object if not found
            if (res.status === 404) return NextResponse.json({});
            const errorText = await res.text();
            console.error('Backend Workspace Settings Error:', res.status, errorText);
            try {
                return NextResponse.json(JSON.parse(errorText), { status: res.status });
            } catch {
                return NextResponse.json({ error: errorText || res.statusText }, { status: res.status });
            }
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (err) {
        console.error('Workspace settings API error:', err);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:5050';
    const body = await req.json();

    try {
        const res = await fetch(`${apiUrl}/api/settings/workspace`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error('Backend Update Workspace Settings Error:', res.status, errorText);
            try {
                return NextResponse.json(JSON.parse(errorText), { status: res.status });
            } catch {
                return NextResponse.json({ error: errorText || res.statusText }, { status: res.status });
            }
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (err) {
        console.error('Update workspace API error:', err);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
