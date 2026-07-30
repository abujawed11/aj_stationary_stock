.PHONY: help install install-backend install-frontend \
	backend-dev frontend-dev \
	prisma-generate prisma-validate prisma-migrate prisma-reset prisma-seed prisma-studio \
	backend-test frontend-lint frontend-build frontend-preview

help:
	@echo "Available targets:"
	@echo "  make install            Install backend + frontend dependencies"
	@echo "  make backend-dev        Start backend dev server (nodemon)"
	@echo "  make frontend-dev       Start frontend dev server (vite)"
	@echo "  make prisma-generate    Regenerate Prisma client"
	@echo "  make prisma-validate    Validate schema.prisma"
	@echo "  make prisma-migrate     Run Prisma migrations (dev)"
	@echo "  make prisma-reset       Drop and recreate the database, reapply migrations"
	@echo "  make prisma-seed        Run Prisma seed script"
	@echo "  make prisma-studio      Open Prisma Studio"
	@echo "  make backend-test       Run backend tests (vitest)"
	@echo "  make frontend-lint      Run frontend lint (oxlint)"
	@echo "  make frontend-build     Build frontend for production"
	@echo "  make frontend-preview   Preview frontend production build"

install: install-backend install-frontend

install-backend:
	npm --prefix backend install

install-frontend:
	npm --prefix frontend install

backend-dev:
	npm --prefix backend run dev

frontend-dev:
	npm --prefix frontend run dev

prisma-generate:
	npm --prefix backend run prisma:generate

prisma-validate:
	npm --prefix backend run prisma:validate

prisma-migrate:
	npm --prefix backend run prisma:migrate

prisma-reset:
	npm --prefix backend run prisma:reset

prisma-seed:
	npm --prefix backend run prisma:seed

prisma-studio:
	npm --prefix backend run prisma:studio

backend-test:
	npm --prefix backend test

frontend-lint:
	npm --prefix frontend run lint

frontend-build:
	npm --prefix frontend run build

frontend-preview:
	npm --prefix frontend run preview
