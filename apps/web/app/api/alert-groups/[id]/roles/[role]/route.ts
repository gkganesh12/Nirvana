import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; role: string }> },
) {
  const { getToken } = await auth();
  const token = await getToken();

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, role } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5050';

  try {
    const res = await fetch(`${apiUrl}/api/alert-groups/${id}/roles/${role}`, {
      method: 'DELETE',
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
    console.error('Incident role removal API error:', err);
    return NextResponse.json({ error: 'Failed to remove incident role' }, { status: 500 });
  }
}
