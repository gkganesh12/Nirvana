import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(_req: NextRequest) {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:5050';
  const res = await fetch(`${apiUrl}/api/settings/twilio`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function PUT(req: NextRequest) {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:5050';
  const body = await req.json();
  const res = await fetch(`${apiUrl}/api/settings/twilio`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
