'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
import { Label } from '@/components/ui/label';
import { login } from '../lib/utils/api';
import { useSession } from '../lib/context/session';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const { session, setSession } = useSession();
  const router = useRouter();

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

  // --- Logged-in View ---
  if (session) {
    return (
      <main className='flex items-center justify-center min-h-screen bg-background'>
        {/* Anda juga bisa melebarkan card ini jika perlu */}
        <Card className='w-full max-w-sm'>
          <CardHeader className='text-center'>
            <CardTitle>
              Welcome, {session.user.username || session.user.firstname}
            </CardTitle>
            <CardDescription>
              You are logged in as {session.user.role?.role_name || 'User'}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-2 text-sm'>
            <p>
              <strong>Email:</strong> {session.user.email}
            </p>
            <p>
              <strong>Session expires:</strong>{' '}
              {new Date(session.expiresAt).toLocaleString('id-ID')}
            </p>
          </CardContent>
          <CardFooter>
            <Button variant='destructive' onClick={handleLogout} className='w-full'>
              Logout
            </Button>
          </CardFooter>
        </Card>
      </main>
    );
  }

  // --- Login Form View ---
  return (
    <main className='flex items-center justify-center min-h-screen bg-muted/10 p-4'>
      {/* PERUBAHAN DI SINI: dari max-w-sm menjadi max-w-md */}
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <CardTitle>SYNTRA Login Portal</CardTitle>
          <CardDescription>
            Enter your credentials to access the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex justify-center mb-6'>
            <Image
              src='/logo.png'
              alt='Company Logo'
              width={100}
              height={100}
              priority
              className='object-contain rounded-full'
            />
          </div>
          <form onSubmit={handleLogin}>
            <div className='grid gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='username'>Username</Label>
                <Input
                  id='username'
                  type='text'
                  placeholder='your_username'
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='password'>Password</Label>
                <Input
                  id='password'
                  type='password'
                  placeholder='••••••••'
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              {error && (
                <p className='text-sm font-medium text-destructive'>{error}</p>
              )}
              <Button type='submit' className='w-full' disabled={loading}>
                {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Login
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className='flex justify-center'>
          <Button variant='link' className='text-sm text-muted-foreground'>
            Forgot your password?
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}