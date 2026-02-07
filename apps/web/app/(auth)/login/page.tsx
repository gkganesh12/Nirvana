'use client';

import { SignIn } from '@clerk/nextjs';

import { AuthCard } from '../_components/auth-card';
import { authClerkAppearance } from '../_components/clerk-appearance';

export default function LoginPage() {
  return (
    <AuthCard>
      <SignIn appearance={authClerkAppearance} />
    </AuthCard>
  );
}
