'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation'; // Tambahkan ini
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SquareAsterisk, UserIcon } from 'lucide-react';

import { login } from '../lib/utils/api';
import { useSession } from '../lib/context/session';

export default function LoginPage() {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const { session, setSession } = useSession();
  const router = useRouter(); // Tambahkan ini

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await login(username, password);
      const expiresAt = response.data.expires_at!.seconds * 1000;
      setSession({
        token: response.data.token || '',
        user: response.data.user,
        expiresAt,
      });
      router.replace('/Kasir'); // Redirect setelah login sukses
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => setSession(null);

  if (session) {
    return (
      <main className='flex flex-col items-center justify-center min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]'>
        <Card className='w-full max-w-sm rounded-2xl p-4'>
          <CardHeader>
            <CardTitle>
              Welcome, {session.user.username || session.user.firstname}
            </CardTitle>
            <CardDescription>
              You are logged in as {session.user.role?.role_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              <strong>Email:</strong> {session.user.email}
            </p>
            <p>
              <strong>Active:</strong> {session.user.is_active ? 'Yes' : 'No'}
            </p>
            <p>
              <strong>Last login:</strong>{' '}
              {session.user.last_login
                ? new Date(
                    session.user.last_login.seconds * 1000
                  ).toLocaleString()
                : 'N/A'}
            </p>
            <p>
              <strong>Session expires at:</strong>{' '}
              {new Date(session.expiresAt).toLocaleString()}
            </p>
          </CardContent>
          <CardFooter>
            <Button variant='destructive' onClick={handleLogout}>
              Logout
            </Button>
          </CardFooter>
        </Card>
      </main>
    );
  }

  return (
    <main className='flex flex-col items-center justify-center min-h-screen transition-colors duration-300 bg-[hsl(var(--background))] text-[hsl(var(--foreground))]'>
      <img
        src='https://placehold.co/256x256'
        alt=''
        className='w-full aspect-[3/2] object-cover -mb-4 md:hidden'
      />
      <Card className='w-full min-h-screen md:min-h-auto md:max-w-sm rounded-b-none rounded-t-2xl md:rounded-b-2xl'>
        <CardHeader>
          <CardTitle>SYNTRA Login Portal</CardTitle>
          <CardDescription>
            Enter your credentials to access SYNTRA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid w-full items-center gap-4'>
            <img
              src='https://placehold.co/256x256'
              alt=''
              className='justify-self-center rounded hidden md:block'
            />

            <div className='grid gap-2'>
              <Label htmlFor='username'>Username</Label>
              <Input
                id='username'
                type='text'
                placeholder='Enter username'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='password'>Password</Label>
              <Input
                id='password'
                type='password'
                placeholder='Enter password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex justify-between w-full gap-2'>
          <Button variant='link' className='p-0 h-auto'>
            Forgot password?
          </Button>
          <Button onClick={handleLogin} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}