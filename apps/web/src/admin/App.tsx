import { useState } from 'react';
import { getStoredSession, signOut, type AuthSession } from '../lib/auth.js';
import { LoginForm } from './LoginForm.js';
import { AdminDashboard } from './AdminDashboard.js';

export function App(): React.JSX.Element {
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession());

  if (!session) {
    return <LoginForm onSignedIn={setSession} />;
  }

  return (
    <AdminDashboard
      session={session}
      onSignOut={() => {
        signOut();
        setSession(null);
      }}
    />
  );
}
