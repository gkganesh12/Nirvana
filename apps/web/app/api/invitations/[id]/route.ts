import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5050';

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;

    try {
        const res = await fetch(`${API_URL}/api/invitations/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {
            const error = await res.text();
            return NextResponse.json({ error }, { status: res.status });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Invitation DELETE error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
