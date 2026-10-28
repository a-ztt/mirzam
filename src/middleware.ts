import { NextResponse, type NextRequest } from "next/server";

import goneSlugs from "@/lib/gone-slugs.json";
import slugRedirects from "@/lib/slug-redirects.json";

// Slug'и, отдаваемые как 410 Gone (Google быстрее убирает из индекса, чем при 404).
// Список генерируется scripts/generate-deactivate-no-photo.mjs из снапшота прод-БД:
// объединение исходных truly-missing slug'ов из GSC 404-отчёта и старых+новых slug'ов
// товаров без фото, которые мы деактивировали.
const GONE_SLUGS = new Set<string>(goneSlugs as string[]);

// Старый slug → новый slug. Используется для 301-редиректа после slug-миграции
// (1087 активных товаров получили человекочитаемые slug'и).
const SLUG_REDIRECTS = slugRedirects as Record<string, string>;

const PRODUCT_PREFIX = "/products/";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Orphan-URL "/$" — битая внешняя ссылка из GSC.
  if (pathname === "/$") {
    return NextResponse.redirect(new URL("/", req.url), 301);
  }

  // Все остальные правила касаются только /products/<slug>.
  if (!pathname.startsWith(PRODUCT_PREFIX)) {
    return NextResponse.next();
  }

  // Next обычно отдаёт декодированный pathname, но кириллические slug'и
  // безопаснее проверять в обоих видах.
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // ignore
  }

  const slugEncoded = pathname.slice(PRODUCT_PREFIX.length);
  const slugDecoded = decoded.slice(PRODUCT_PREFIX.length);

  // 1. 410 Gone для slug'ов, которых нет в БД.
  if (GONE_SLUGS.has(slugEncoded) || GONE_SLUGS.has(slugDecoded)) {
    return new NextResponse("Gone — this page no longer exists.", {
      status: 410,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex",
      },
    });
  }

  // 2. 301 редирект со старого slug'а на новый человекочитаемый.
  const newSlug =
    SLUG_REDIRECTS[slugEncoded] ?? SLUG_REDIRECTS[slugDecoded] ?? null;
  if (newSlug) {
    const target = req.nextUrl.clone();
    target.pathname = `${PRODUCT_PREFIX}${newSlug}`;
    return NextResponse.redirect(target, 301);
  }

  return NextResponse.next();
}

export const config = {
  // Запускаем на всех страничных запросах, кроме статики/API/служебных.
  // Это нужно, чтобы поймать литеральный путь "/$" (его не покрывает
  // обычный path-to-regexp matcher).
  matcher: [
    "/((?!_next/static|_next/image|api/|favicon|robots|sitemap|.*\\.[A-Za-z0-9]+$).*)",
  ],
};
