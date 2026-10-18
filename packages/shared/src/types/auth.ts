export type UserRole = 'USER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthSessionResponse {
  accessToken: string;
  user: AuthUser;
}
