import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:5050';

export async function GET(
    req: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const { getToken } = auth();
    const token = await getToken();
    const pathSegments = params.path || [];
    const apiPath = pathSegments.join('/');

    const response = await fetch(`${API_BASE}/api/saml/${apiPath}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    // Handle XML response for metadata
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/xml')) {
        const xml = await response.text();
        return new NextResponse(xml, {
            status: response.status,
            headers: { 'Content-Type': 'application/xml' },
        });
    }

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

    const response = await fetch(`${API_BASE}/api/saml/${apiPath}`, {
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

export async function POST(
    req: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const { getToken } = auth();
    const token = await getToken();

    const pathSegments = params.path || [];
    const apiPath = pathSegments.join('/');
    const body = await req.text();

    const response = await fetch(`${API_BASE}/api/saml/${apiPath}`, {
        method: 'POST',
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'Content-Type': req.headers.get('content-type') || 'application/json',
        },
        body,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
}
