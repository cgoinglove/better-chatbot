// Better Auth configuration
export const authConfig = {
  pages: {
    signIn: '/login',
    newUser: '/',
  },
  providers: [
    {
      type: 'emailAndPassword',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
    },
  ],
  callbacks: {
    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const url = new URL(request.url);
      const isOnChat = url.pathname === '/';
      const isOnRegister = url.pathname.startsWith('/register');
      const isOnLogin = url.pathname.startsWith('/login');

      if (isLoggedIn && (isOnLogin || isOnRegister)) {
        return Response.redirect(new URL('/', request.url));
      }

      if (!isLoggedIn && isOnChat) {
        return Response.redirect(new URL('/login', request.url));
      }

      return true;
    },
  },
};
