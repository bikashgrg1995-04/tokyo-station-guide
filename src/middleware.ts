import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(
  async ({ url, session, redirect }, next) => {
    const pathname = url.pathname;

    // Admin login page is public.
    if (pathname === '/admin/auth/login') {
      return next();
    }

    // Protect every other /admin route.
    if (pathname.startsWith('/admin')) {
      const admin = await session?.get('admin');

      if (!admin) {
        return redirect('/admin/auth/login');
      }
    }

    return next();
  },
);