export interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in: string | null;
}

export interface AuthSession {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}
