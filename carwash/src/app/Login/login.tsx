'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SquareAsterisk, UserIcon, Loader2 } from 'lucide-react';
import { login } from '../lib/utils/api';
import { useSession } from '../lib/context/session';

export default function LoginPage() {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const { session, setSession } = useSession();
  const router = useRouter();

  // ✅ Logic login sesuai punyamu
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username || !password) {
      setError('Username and password are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await login(username, password);
      const expiresAt = response.data.expires_at
        ? response.data.expires_at.seconds * 1000
        : Date.now() + 3600 * 1000;

      setSession({
        token: response.data.token || '',
        user: response.data.user,
        expiresAt,
      });

      router.replace('/Kasir');
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => setSession(null);

  // ✅ Jika sudah login
  if (session) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
        <Card className="w-full max-w-md rounded-2xl p-6">
          <CardHeader className="text-center">
            <CardTitle>
              Welcome, {session.user.username || session.user.firstname}
            </CardTitle>
            <CardDescription>
              You are logged in as {session.user.role?.role_name || 'User'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>Email:</strong> {session.user.email}
            </p>
            <p>
              <strong>Session expires:</strong>{' '}
              {new Date(session.expiresAt).toLocaleString('id-ID')}
            </p>
          </CardContent>
          <CardFooter>
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-full"
            >
              Logout
            </Button>
          </CardFooter>
        </Card>
      </main>
    );
  }

  // ✅ Login form view
  return (
    <main className="flex flex-col items-center justify-center min-h-screen transition-colors duration-300 bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
     
      <video
        src="/evernight.mp4"
        width={256}
        height={256}
        autoPlay
        muted
        playsInline
        loop
        ref={(el) => {
          if (el) {
            el.onloadedmetadata = () => {
              el.currentTime = 10; // mulai dari detik ke-10
            };
          }
        }}
        className="w-full aspect-[3/2] object-cover -mb-4 md:hidden"
      />

      {/* Form Card */}
      <Card className="w-full md:max-w-md rounded-b-none md:rounded-2xl shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            SYNTRA Login Portal
          </CardTitle>
          <CardDescription>
            Enter your credentials to access SYNTRA.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid w-full items-center gap-4">
            {/* ✅ Video logo besar untuk desktop */}
            <div className="justify-self-center hidden md:block mb-4">
              <video
                src="/evernight.mp4"
                width={200}
                height={200}
                autoPlay
                muted
                playsInline
                loop
                ref={(el) => {
                  if (el) {
                    el.onloadedmetadata = () => {
                      el.currentTime = 10;
                    };
                  }
                }}
                className="rounded-full shadow-md object-cover transition-all duration-700 hover:scale-105"
              />
            </div>

            {/* Username Input */}
            <div className="space-y-1">
              <label
                htmlFor="username"
                className="text-sm font-medium text-foreground flex items-center gap-2"
              >
                <UserIcon className="h-4 w-4 text-muted-foreground" /> Username
              </label>
              <Input
                id="username"
                type="text"
                placeholder="your_username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="h-11 text-base"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground flex items-center gap-2"
              >
                <SquareAsterisk className="h-4 w-4 text-muted-foreground" /> Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-11 text-base"
              />
            </div>

            {error && (
              <p className="text-sm font-medium text-destructive text-center">
                {error}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-between w-full gap-2">
          <Button variant="link" className="p-0 h-auto text-sm">
            Forgot password?
          </Button>
          <Button onClick={handleLogin} disabled={loading} className="h-11 px-6">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging in...
              </>
            ) : (
              'Login'
            )}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
