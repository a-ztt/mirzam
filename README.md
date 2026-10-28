# mirzam.kz — каталог автозапчастей

Сайт-каталог автозапчастей (г. Жезказган): распродажа складских остатков с ценами и наличием,
корзина с оформлением заказа через WhatsApp, отзывы и админка для управления товарами.

Сайт в работе: **https://mirzam.kz**

> Это публичная копия рабочего проекта. В репозиторий не входят база данных, прайсы, фотографии
> товаров и инструкции по серверу, поэтому свежий клон стартует с пустой базой и демо-каталогом.

## Стек

- **Next.js 15** (App Router, Server Actions, middleware) + **React 19**
- **TypeScript**
- **Prisma 6** + **SQLite**
- **Tailwind CSS 3**, иконки `@ant-design/icons`
- **xlsx** — импорт прайсов из Excel

## Возможности

**Витрина**
- Каталог с поиском, фильтрами (категория, бренд, состояние, цена), сеткой/списком и пагинацией
- Карточка товара: галерея с лайтбоксом, применимость, копирование артикула, отзывы о товаре
- Корзина в `localStorage` → готовое сообщение с заказом в WhatsApp
- Отзывы о магазине с премодерацией
- Мобильная навигация, плавающая кнопка WhatsApp

**Админка** (`/admin`)
- Вход по логину и паролю из env, сессия в подписанной (HMAC) cookie, защита от перебора
- Товары: создание (новые создаются черновиками), редактирование, загрузка фото
- Справочники: категории, бренды, единицы измерения
- Модерация отзывов

**SEO**
- Динамические `sitemap.xml` и `robots.txt`
- `noindex` и canonical для фильтров и пагинации
- Middleware: 301-редиректы со старых slug'ов ([src/lib/slug-redirects.json](src/lib/slug-redirects.json))
  и `410 Gone` для удалённых товаров ([src/lib/gone-slugs.json](src/lib/gone-slugs.json))

## Быстрый старт

Нужен Node.js 20+.

```bash
npm install
cp .env.example .env        # и заполнить переменные (см. ниже)
npx prisma migrate dev      # создаст БД и применит миграции
npm run dev
```

Сайт откроется на http://localhost:3000, админка — на http://localhost:3000/admin.

Пока в базе нет активных товаров, каталог показывает несколько встроенных демо-товаров
([src/lib/mockProducts.ts](src/lib/mockProducts.ts)). Свои товары можно завести в админке.

> `DATABASE_URL="file:./prisma/dev.db"` Prisma резолвит относительно `prisma/schema.prisma`,
> поэтому файл базы фактически лежит в `prisma/prisma/dev.db`.

## Переменные окружения

Шаблон — [.env.example](.env.example).

| Переменная | Назначение |
|---|---|
| `DATABASE_URL` | Путь к SQLite-базе, например `file:./prisma/dev.db` |
| `ADMIN_USER` | Логин администратора (по умолчанию `admin`) |
| `ADMIN_PASSWORD` | Пароль администратора. Если пустой, вход в админку невозможен |
| `SESSION_SECRET` | Секрет для подписи сессионной cookie — длинная случайная строка (`openssl rand -hex 32`) |
| `AUTH_COOKIE_SECURE` | `true` для HTTPS; `false` только при доступе по голому HTTP |
| `UPLOAD_DIR` | Папка для загруженных фото (по умолчанию `./uploads`) |
| `NEXT_PUBLIC_SITE_URL` | Публичный адрес сайта для canonical, sitemap и robots. Если не задан — `https://mirzam.kz` |

## Команды

| Команда | Что делает |
|---|---|
| `npm run dev` | Dev-сервер |
| `npm run build` | Продакшн-сборка |
| `npm run start` | Запуск собранного приложения |
| `npm run lint` | ESLint |
| `npm run prisma:generate` | Сгенерировать Prisma Client |
| `npm run prisma:migrate` | Создать/применить миграцию в dev |
| `npm run prisma:studio` | Prisma Studio — просмотр и правка БД |

## Структура

```
src/
  app/                  страницы (App Router)
    page.tsx            каталог (главная)
    products/[slug]/    карточка товара
    cart/               корзина → WhatsApp
    reviews/            отзывы
    contacts/           контакты
    admin/              админка: товары, справочники, отзывы, вход
    api/uploads/        отдача загруженных фото из UPLOAD_DIR
    sitemap.ts, robots.ts
  lib/
    auth.ts             сессия админа, проверка логина, троттлинг
    db.ts               Prisma Client
    mockProducts.ts     чтение каталога из БД (с unstable_cache) и демо-товары
    excelImport.ts      разбор Excel-прайсов
    importExcelToDb.ts  запись импорта в БД
    uploads.ts          сохранение и URL фотографий
    reviews.ts          отзывы
  middleware.ts         301/410 для старых и удалённых slug'ов
prisma/                 схема и миграции
scripts/                разовые скрипты SEO-аудита и генерации SQL-миграций
```

## Импорт из Excel

Разбор прайсов ([src/lib/excelImport.ts](src/lib/excelImport.ts)) читает все `.xlsx` из `data/import/`,
а если папка пуста — `data/products.xlsx`. Товары сопоставляются по slug: новые создаются, существующие
обновляются. Ожидаемые колонки: «Наименование», «Номер по каталогу», «Кол-во», «Ед.изм.», «Цена».

Сами прайсы в репозиторий не входят (`data/import/` и `*.xlsx` в `.gitignore`). Кнопка
«Импортировать Excel» в админке сейчас скрыта — она закомментирована в
[src/app/admin/page.tsx](src/app/admin/page.tsx), серверный экшен `importExcelAction` остался рабочим.

## Фото товаров

Фото хранятся на диске в `UPLOAD_DIR` (в git не попадают) и отдаются через `/api/uploads/...`.
В БД (`ProductImage.path`) хранится только относительный путь.

## Кэш каталога

Список товаров кэшируется через `unstable_cache` в `.next/cache`. Изменения через админку сбрасывают
кэш автоматически, а после прямых правок БД (SQL, замена файла базы) его нужно очистить вручную:

```bash
rm -rf .next/cache
# и перезапустить приложение
```

## SEO-миграция slug'ов

Скрипты в [scripts/](scripts/) — разовые инструменты, которыми проводилась SEO-чистка рабочего сайта:
перевод ~1000 товаров на человекочитаемые slug'и, уникализация дублирующихся названий и деактивация
товаров без фото. Они читают снимок продакшн-базы `prisma/prod-snapshot.db` (в репозиторий не входит),
генерируют SQL-миграции с откатом и JSON-карты для middleware. Запускаются из корня проекта:

```bash
node scripts/plan-slug-migration.mjs           # dry-run: план и отчёты
node scripts/generate-migration-artifacts.mjs  # SQL + src/lib/slug-redirects.json
```

## Деплой

Продакшн работает за nginx под pm2. Типовое обновление на сервере, из папки проекта:

```bash
sqlite3 prisma/prisma/dev.db ".backup prisma/prisma/dev.db.bak-$(date +%Y%m%d-%H%M%S)"
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 restart <имя-процесса>
```

## Если разворачиваете у себя

Под конкретный магазин захардкожены:
- номер WhatsApp/телефона — [src/app/layout.tsx](src/app/layout.tsx), [src/app/contacts/page.tsx](src/app/contacts/page.tsx),
  [src/app/cart/page.tsx](src/app/cart/page.tsx), [src/app/products/[slug]/page.tsx](src/app/products/[slug]/page.tsx),
  [src/app/FloatingWhatsApp.tsx](src/app/FloatingWhatsApp.tsx);
- домен в редиректе http → https в [next.config.js](next.config.js) и значение по умолчанию для
  `NEXT_PUBLIC_SITE_URL`;
- файл подтверждения Яндекс.Вебмастера в `public/`.
