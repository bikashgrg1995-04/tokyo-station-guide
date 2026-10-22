import { defineMiddleware } from 'astro:middleware';
import {
  isCacheablePage,
  purgePages,
  readPageCache,
  storePage,
} from './lib/cache/edge-cache';

const isAdminPath = (pathname: string) =>
  pathname.startsWith('/admin') || pathname.startsWith('/api/admin');

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, session, redirect, request, locals } = context;
  const pathname = url.pathname;
  const waitUntil = locals.cfContext?.waitUntil.bind(locals.cfContext);

  // ---- Public pages: serve from the edge cache when possible. ----
  if (isCacheablePage(request, url)) {
    const cached = await readPageCache(url);

    if (cached) {
      if (cached.headers.get('X-Cache') === 'STALE') {
        // Serve the old copy now, refresh it in the background.
        waitUntil?.(
          next().then((fresh) => storePage(url, fresh, waitUntil)),
        );
      }
      return cached;
    }

    return await storePage(url, await next(), waitUntil);
  }

  // ---- Admin ----
  // Admin login page is public.
  if (pathname === '/admin/auth/login') {
    const response = await next();
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }

  // Protect every other /admin route.
  if (pathname.startsWith('/admin')) {
    const admin = await session?.get('admin');

    if (!admin) {
      return redirect('/admin/auth/login');
    }
  }

  const response = await next();

  if (isAdminPath(pathname)) {
    // Never cache admin pages or admin API answers.
    response.headers.set('Cache-Control', 'private, no-store');

    // A successful change from the admin makes the public page out of date.
    if (request.method !== 'GET' && request.method !== 'HEAD' && response.status < 400) {
      purgePages(url, waitUntil);
    }
  }

  return response;
});
