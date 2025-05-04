import { z } from "zod";

export type User = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export type UserService = {
  register: (
    user: Omit<User, "id"> & { plainPassword: string },
  ) => Promise<User>;
  existsByEmail: (email: string) => Promise<boolean>;
  selectByEmail: (
    email: string,
  ) => Promise<(User & { password: string }) | null>;
  updateUser: (id: string, user: Pick<User, "name" | "image">) => Promise<User>;
};

export const UserZodSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});
