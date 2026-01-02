'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

export function UserSummary() {
  const { user, isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return <p className="text-sm text-muted-foreground">Checking session...</p>;
  }

  if (!isSignedIn) {
    return (
      <p className="text-sm text-muted-foreground">
        Not signed in.{' '}
        <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>
        .
      </p>
    );
  }

  const label = user?.primaryEmailAddress?.emailAddress ?? user?.username ?? 'Signed in';

  return (
    <p className="text-sm text-muted-foreground">
      Signed in as <span className="font-medium text-foreground">{label}</span>
    </p>
  );
}
