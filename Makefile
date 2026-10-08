.PHONY: dev build test lint format docker-up docker-down docker-build db-migrate db-seed clean

dev:
	pnpm dev

build:
	pnpm build

test:
	pnpm test

lint:
	pnpm lint

type-check:
	pnpm type-check

format:
	pnpm format

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-build:
	docker compose build

docker-logs:
	docker compose logs -f

db-migrate:
	pnpm --filter @restaurant/api prisma:migrate

db-generate:
	pnpm --filter @restaurant/api prisma:generate

db-seed:
	pnpm --filter @restaurant/api prisma:seed

clean:
	pnpm clean
