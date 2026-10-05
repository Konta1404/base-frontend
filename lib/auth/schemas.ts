import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  name: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
});

export const AuthResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  expiresIn: z.number().int().positive().optional(),
  user: UserSchema.optional(),
});
