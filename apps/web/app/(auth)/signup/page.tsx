'use client';

import { SignUp } from '@clerk/nextjs';

import { AuthCard } from '../_components/auth-card';
import { authClerkAppearance } from '../_components/clerk-appearance';

export default function SignupPage() {
  return (
    <AuthCard>
      <SignUp appearance={authClerkAppearance} />
    </AuthCard>
  );
}
