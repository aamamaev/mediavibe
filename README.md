# MediaVibe

MediaVibe — рекомендательная платформа для фильмов
(React + Express, EASE на FastAPI, Qdrant, PostgreSQL, Yandex Cloud Object Storage
и YandexGPT).

Репозиторий: <https://github.com/aamamaev/mediavibe>

## Архитектура

```
                 ┌──────────────────────────── VM 79.174.83.244 ───────────────────────────┐
   браузер ──80──▶  web (Node 22 / Express + собранный React-клиент)                     │
                 │     │              │                    │                              │
                 │     ▼              ▼                    ▼                              │
                 │  postgres:16    ease:6334          qdrant:6333                        │
                 │  (users,       (FastAPI +          (movie_embeddings,                  │
                 │   movies,       EASE.pickle)        2606 векторов)                     │
                 │   ratings…)                                                     │
                 └───────────────┬───────────────────────────────────────────────────────┘
                                 │ S3 API (presigned URL, JSON фильмов)
                                 ▼
                    Yandex Cloud Object Storage — bucket `cinefeels`
```

- **web** — Node.js/Express, отдаёт REST API `/api/*` и статику клиента из `dist/public`.
- **ease** — отдельный FastAPI-сервис (`server/ease_service`) с моделью `attached_assets/EASE/EASE.pickle`.
- **qdrant** — векторный поиск (коллекция `movie_embeddings`, 384-мерные эмбеддинги multilingual-e5-small).
- **postgres** — пользователи, фильмы, оценки, watchlist, favorites.
- **S3** — тот же бакет `cinefeels` (постеры и JSON фильмов), доступ по ключам из `.env`.

## Структура репозитория

```
client/                  React-клиент (Vite)
server/                  Express API, интеграции S3/Qdrant/YandexGPT, EASE FastAPI
  ease_service/          FastAPI-микросервис EASE
shared/schema.ts         Drizzle-схема PostgreSQL
scripts/                 синхронизация фильмов и индексация Qdrant
attached_assets/EASE/    модель EASE.pickle и маппинг fid → efid
Dockerfile.web           образ Node.js-приложения
Dockerfile.ease          образ FastAPI-сервиса
docker-compose.yml       postgres + qdrant + ease + web
scripts/deploy.sh        сборка и выкладка на VM
```

## Переменные окружения

Все значения — в `.env` (в git не попадает, шаблон — `.env.example`).

| Переменная | Назначение |
|---|---|
| `SESSION_SECRET` | секрет express-session |
| `SESSION_COOKIE_SECURE` | `false` для доступа по HTTP (IP без TLS) |
| `YANDEX_API_KEY`, `YANDEX_CATALOG_ID` | YandexGPT |
| `YANDEX_S3_ACCESS_KEY_ID`, `YANDEX_S3_SECRET_ACCESS_KEY`, `YANDEX_S3_BUCKET` | Object Storage (бакет `cinefeels`) |
| `QDRANT_HOST` | `http://qdrant:6333` в compose |
| `EASE_SERVICE_URL` | `http://ease:6334` в compose |
| `START_EASE_SERVICE` | `false` — EASE запускается отдельным контейнером |
| `POSTGRES_*`, `DATABASE_URL` | PostgreSQL |

## Локальный запуск

```bash
cp .env.example .env        # заполнить секреты
npm ci
npm run dev                 # http://localhost:5000 (Vite + Express, EASE стартует сам)
```

Для локального запуска нужны PostgreSQL и Qdrant (например, `docker compose up -d postgres qdrant`)
и `DATABASE_URL` в `.env`.

## Деплой на виртуальную машину

VM: `79.174.83.244` (Ubuntu, root, вход по ключу `ssh-key-1766397340058`).

Первый деплой:

```bash
# 1. На VM: docker + docker compose (Ubuntu)
ssh -i ssh-key-1766397340058/ssh-key-1766397340058 root@79.174.83.244
apt-get update && apt-get install -y docker.io docker-compose-v2
systemctl enable --now docker

# 2. С локальной машины: код + .env
rsync -az --exclude .git --exclude node_modules --exclude dist \
  --exclude .env --exclude 'ssh-key-*' -e "ssh -i ssh-key-1766397340058/ssh-key-1766397340058" \
  ./ root@79.174.83.244:/opt/mediavibe/
scp -i ssh-key-1766397340058/ssh-key-1766397340058 .env root@79.174.83.244:/opt/mediavibe/.env

# 3. На VM: сборка и запуск
cd /opt/mediavibe
docker compose up -d --build
docker compose run --rm migrate                              # схема PostgreSQL
docker compose run --rm tools npx tsx scripts/sync-movies.ts # фильмы из S3
docker compose run --rm tools npx tsx scripts/index-movies-llamaindex.ts # эмбеддинги
```

Приложение: <http://79.174.83.244>

Обновление кода после изменений:

```bash
./scripts/deploy.sh
```

## Обслуживание

```bash
docker compose ps
docker compose logs -f web
docker compose run --rm tools npx tsx scripts/sync-movies.ts
docker compose restart web
```

Qdrant и PostgreSQL наружу не проброшены (Qdrant слушает только `127.0.0.1:6333`).
Для доступа к Qdrant-дашборду используйте SSH-туннель:

```bash
ssh -i ssh-key-1766397340058/ssh-key-1766397340058 -L 6333:127.0.0.1:6333 root@79.174.83.244
# http://localhost:6333/dashboard
```

## Примечания

- `.env` и приватный SSH-ключ в репозиторий не коммитятся (см. `.gitignore`).
- Модель `EASE.pickle` (~52 МБ) хранится в репозитории, чтобы образ EASE собирался без внешних загрузок.
- Сессия хранится в памяти процесса web; после рестарта контейнера нужно войти заново.
- Клиент и API отдаются одним origin, поэтому CORS не требуется.
