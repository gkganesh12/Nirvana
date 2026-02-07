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

  const res = await fetch(`${apiUrl}/api/alert-groups/${id}/change-events`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => []);
  return NextResponse.json(data, { status: res.status });
}
