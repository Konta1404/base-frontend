export type User = {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  [key: string]: unknown;
};

/** What the backend returns from login / register / google / refresh. */
export type AuthResponse = {
  accessToken: string;
  refreshToken?: string;
  /** Access token lifetime in seconds. */
  expiresIn?: number;
  user?: User;
};

export type FormState =
  | {
      errors?: Record<string, string[] | undefined>;
      message?: string;
      values?: Record<string, string>;
    }
  | undefined;
