import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { defaultLocale, locales, type Locale } from '@/i18n/config';

function getLocaleFromRequest(request: NextRequest): Locale {
  // 1. Check cookie
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  if (localeCookie && locales.includes(localeCookie as Locale)) {
    return localeCookie as Locale;
  }

  // 2. Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const browserLocale = acceptLanguage.split(',')[0].split('-')[0];
    if (locales.includes(browserLocale as Locale)) {
      return browserLocale as Locale;
    }
  }

  return defaultLocale;
}

export async function middleware(request: NextRequest) {
  // Get the response from auth middleware
  const response = await updateSession(request);

  // If it's a redirect, return it directly
  if (response.status !== 200) {
    return response;
  }

  // Set locale cookie if not present
  const localeCookie = request.cookies.get('NEXT_LOCALE');
  if (!localeCookie) {
    const locale = getLocaleFromRequest(request);
    response.cookies.set('NEXT_LOCALE', locale, {
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: '/',
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes that don't need auth
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
