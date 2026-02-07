'use client';

import { useEffect } from 'react';

const AUTH_BODY_CLASS = 'auth-body';

export function AuthBodyStyle() {
  useEffect(() => {
    document.documentElement.classList.add(AUTH_BODY_CLASS);
    document.body.classList.add(AUTH_BODY_CLASS);

    return () => {
      document.documentElement.classList.remove(AUTH_BODY_CLASS);
      document.body.classList.remove(AUTH_BODY_CLASS);
    };
  }, []);

  return null;
}
