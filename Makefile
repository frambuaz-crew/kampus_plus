.PHONY: up install

up:
	test -f backend/.env || cp backend/.env.example backend/.env
	test -f frontend/.env || cp frontend/.env.example frontend/.env
	docker compose up --build -d
	docker compose logs -f backend

install: up
