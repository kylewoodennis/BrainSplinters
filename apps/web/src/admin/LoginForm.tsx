import { useState } from 'react';
import { completeNewPassword, signIn, NewPasswordRequiredError, type AuthSession } from '../lib/auth.js';

export function LoginForm({
  onSignedIn,
}: {
  onSignedIn: (session: AuthSession) => void;
}): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [challengeSession, setChallengeSession] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const session = await signIn(email, password);
      onSignedIn(session);
    } catch (err) {
      if (err instanceof NewPasswordRequiredError) {
        setChallengeSession(err.session);
      } else {
        setError(err instanceof Error ? err.message : 'Sign-in failed.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!challengeSession) return;
    setError(null);
    setBusy(true);
    try {
      const session = await completeNewPassword(email, newPassword, challengeSession);
      onSignedIn(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set new password.');
    } finally {
      setBusy(false);
    }
  }

  if (challengeSession) {
    return (
      <form className="admin-login" onSubmit={handleNewPassword}>
        <h1>Set a new password</h1>
        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        {error && <p className="error-text">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Working…' : 'Set password and sign in'}
        </button>
      </form>
    );
  }

  return (
    <form className="admin-login" onSubmit={handleSignIn}>
      <h1>BrainSplinters Admin</h1>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="username"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
      />
      {error && <p className="error-text">{error}</p>}
      <button className="btn" type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
