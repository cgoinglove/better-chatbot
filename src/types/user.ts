import { z } from "zod";

export type UserPreferences = {
  displayName?: string;
  profession?: string; // User's job or profession
  responseStyleExample?: string; // Example of preferred response style
  botName?: string; // Name of the bot
};

export type User = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  preferences?: UserPreferences;
};

export type UserRepository = {
  existsByEmail: (email: string) => Promise<boolean>;
  updateUser: (id: string, user: Pick<User, "name" | "image">) => Promise<User>;
  updatePreferences: (
    userId: string,
    preferences: UserPreferences,
  ) => Promise<User>;
  getPreferences: (userId: string) => Promise<UserPreferences | null>;
  findById: (userId: string) => Promise<User | null>;
};

export const UserZodSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export const UserPreferencesZodSchema = z.object({
  displayName: z.string().optional(),
  profession: z.string().optional(),
  responseStyleExample: z.string().optional(),
  botName: z.string().optional(),
});
