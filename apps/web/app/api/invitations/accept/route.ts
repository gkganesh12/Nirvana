import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5050';

export async function POST(req: NextRequest) {
    const { getToken } = await auth();
    const token = await getToken();

    // Acceptance might require a token even if session is not active (user might need to sign up first)
    // However, our InvitationsService handles clerkId, so user MUST be logged in to accept.
    if (!token) return NextResponse.json({ error: 'Please sign in to accept the invitation' }, { status: 401 });

    try {
        const body = await req.json(); // { token: '...' }
        const res = await fetch(`${API_URL}/api/invitations/accept`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const error = await res.json();
            return NextResponse.json(error, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (err) {
        console.error('Accept Invitation POST error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
