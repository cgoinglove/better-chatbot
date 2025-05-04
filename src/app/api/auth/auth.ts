import { compare } from "bcrypt-ts";
import { userService } from "lib/db/user-service";
import NextAuth, { type DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
  interface User {
    id?: string;
    email?: string | null;
    image?: string | null;
  }
}
declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
  }
}

export const {
  handlers: { GET, POST },
  signIn,
  signOut,
  auth,
} = NextAuth({
  pages: {
    signIn: "/login",
    newUser: "/",
  },
  providers: [
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        const user = await userService.selectByEmail(email);
        if (!user) {
          return null;
        }
        const passwordsMatch = await compare(password, user.password);
        if (!passwordsMatch) {
          return null;
        }
        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
      }
      return session;
    },
  },
});
