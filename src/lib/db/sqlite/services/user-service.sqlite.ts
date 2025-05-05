import { User, UserService, UserZodSchema } from "app-types/user";
import { generateHashedPassword } from "lib/db/utils";
import { sqliteDb as db } from "../db.sqlite";
import { UserSchema } from "../schema.sqlite";
import { eq } from "drizzle-orm";
import { convertToTimestamp } from "./utils";

/**
 * @deprecated
 */
export const sqliteUserService: UserService = {
  register: async (
    user: Omit<User, "id"> & { plainPassword: string },
  ): Promise<User> => {
    const parsedUser = UserZodSchema.parse({
      ...user,
      password: user.plainPassword,
    });
    const exists = await sqliteUserService.existsByEmail(parsedUser.email);
    if (exists) {
      throw new Error("User already exists");
    }
    const hashedPassword = generateHashedPassword(parsedUser.password);
    const result = await db
      .insert(UserSchema)
      .values({ ...parsedUser, password: hashedPassword })
      .returning();
    return result[0];
  },
  existsByEmail: async (email: string): Promise<boolean> => {
    const result = await db
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.email, email));
    return result.length > 0;
  },
  selectByEmail: async (
    email: string,
  ): Promise<(User & { password: string }) | null> => {
    const [result] = await db
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.email, email));
    return result;
  },
  updateUser: async (
    id: string,
    user: Pick<User, "name" | "image">,
  ): Promise<User> => {
    const [result] = await db
      .update(UserSchema)
      .set({
        name: user.name,
        image: user.image,
        updatedAt: convertToTimestamp(new Date()),
      })
      .where(eq(UserSchema.id, id))
      .returning();
    return result;
  },
};
