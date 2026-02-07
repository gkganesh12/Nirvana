import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { getToken } = await auth();
  const token = await getToken();

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5050';

  try {
    const res = await fetch(`${apiUrl}/api/alert-groups/${id}/roles`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      return NextResponse.json(error, { status: res.status });
    }

    return NextResponse.json(await res.json());
  } catch (err) {
    console.error('Incident roles API error:', err);
    return NextResponse.json({ error: 'Failed to fetch incident roles' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { getToken } = await auth();
  const token = await getToken();

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5050';
  const body = await req.json();

  try {
    const res = await fetch(`${apiUrl}/api/alert-groups/${id}/roles`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      return NextResponse.json(error, { status: res.status });
    }

    return NextResponse.json(await res.json());
  } catch (err) {
    console.error('Incident role assignment API error:', err);
    return NextResponse.json({ error: 'Failed to assign incident role' }, { status: 500 });
  }
}
