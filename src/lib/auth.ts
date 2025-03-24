import { NextAuthOptions } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyUser } from '@/lib/db';
import { initDb } from '@/lib/db';

// Initialize the database when the server starts
initDb().catch(console.error);

// Define the session and JWT types with our custom fields
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      email: string;
      isAdmin: boolean;
    };
  }

  interface User {
    id: string;
    username: string;
    email: string;
    isAdmin: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    email: string;
    isAdmin: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          // Verify the user credentials
          const user = await verifyUser(credentials.username, credentials.password);
          
          if (!user) {
            return null;
          }
          
          return {
            id: user.id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin
          };
        } catch (error) {
          console.error('Authorization error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user: any }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.email = user.email;
        token.isAdmin = user.isAdmin;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: JWT }) {
      // Send properties to the client
      session.user = {
        id: token.id,
        username: token.username,
        email: token.email,
        isAdmin: token.isAdmin,
      };
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};