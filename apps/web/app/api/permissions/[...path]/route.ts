import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:5050';

export async function GET(
    req: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const { getToken } = auth();
    const token = await getToken();

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pathSegments = params.path || [];
    const apiPath = pathSegments.join('/');

    const response = await fetch(`${API_BASE}/api/permissions/${apiPath}`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
}

export async function PUT(
    req: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const { getToken } = auth();
    const token = await getToken();

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pathSegments = params.path || [];
    const apiPath = pathSegments.join('/');
    const body = await req.json();

    const response = await fetch(`${API_BASE}/api/permissions/${apiPath}`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
}
