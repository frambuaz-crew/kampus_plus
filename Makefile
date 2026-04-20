.PHONY: up install

up:
	docker compose up --build -d
	docker compose logs -f backend

install: up
