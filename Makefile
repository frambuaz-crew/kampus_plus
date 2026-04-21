.PHONY: up install

up:
	test -f backend/.env || cp backend/.env.example backend/.env
	docker compose up --build -d
	docker compose logs -f backend

install: up
