export type User = {
  id: number;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  role_id: number;
  is_active: boolean;
  last_login?: { seconds: number; nanos: number };
  created_at?: { seconds: number; nanos: number };
  updated_at?: { seconds: number; nanos: number };
  role?: {
    id: number;
    role_name: string;
    access_level: number;
    created_at?: { seconds: number; nanos: number };
    updated_at?: { seconds: number; nanos: number };
  };
};

export type LoginResponse = {
  success: boolean;
  message: string;
  data: {
    expires_at?: { seconds: number; nanos: number };
    token?: string;
    user: User;
  };
};

export type Session = {
  token: string;
  user: User;
  expiresAt: number;
};

export type SessionContext = {
  session: Session | null;
  setSession: (session: Session | null) => void;
};