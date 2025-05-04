"use server";

import { User, UserZodSchema } from "app-types/user";
import { userService } from "lib/db/user-service";
import { signIn } from "./auth";

import { safe } from "ts-safe";
import logger from "logger";

export async function existsByEmailAction(email: string) {
  const exists = await userService.existsByEmail(email);
  return exists;
}
export async function registerAction(
  user: Omit<User, "id"> & { plainPassword: string },
) {
  const createdUser = await userService.register(user);
  return createdUser;
}

export async function loginAction({
  email,
  password,
}: { email: string; password: string }) {
  return safe(async () => {
    const validated = UserZodSchema.pick({
      email: true,
      password: true,
    }).parse({ email, password });

    await signIn("credentials", {
      email: validated.email,
      password: validated.password,
      redirect: false,
    });
  })
    .ifFail((e) => {
      logger.error(e);
      throw new Error("Invalid credentials");
    })
    .unwrap();
}
