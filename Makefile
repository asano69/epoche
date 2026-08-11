.PHONY: lint

include epoche.env
export

BINARY := epoche

# Ports used by the dev servers (frontend, backend, and PocketBase-style API)
PORTS := 3000 3001

.PHONY: all
all: kill-ports frontend## (*) Build frontend assets and start the server
	go run ./cmd/$(BINARY) superuser upsert admin@mail.internal password --dir=pb_data
	go run ./cmd/$(BINARY) serve




.PHONY: frontend-deps
frontend-deps:
	cd frontend && pnpm install

.PHONY: build-frontend
build-frontend: frontend-deps
	cd frontend && pnpm run build

.PHONY: build
build: build-frontend
	go build -ldflags="-X github.com/asano69/epoche/internal/version.Version=$(VERSION)" -o $(BINARY) ./cmd/$(BINARY)

.PHONY: kill-ports
kill-ports:
	@for port in $(PORTS); do \
		pid=$$(lsof -ti tcp:$$port); \
		if [ -n "$$pid" ]; then \
			echo "Killing process on port $$port (pid $$pid)"; \
			kill -9 $$pid; \
		fi \
	done


.PHONY: server
server: kill-ports
	#./epoche migrate up --dir=pb_data
	./$(BINARY) superuser upsert admin@mail.internal password --dir=pb_data
	./$(BINARY) serve --dev

# --------------
.PHONY: clean
	rm -fr ./tmp/ # air

# port: 3001
.PHONY: dev-front
dev-front: clean
	npx concurrently -n "frontend,backend" -c "blue,green" "cd frontend && pnpm dev" "go run ./cmd/$(BINARY) serve --dev"

# port: 3000
.PHONY: dev-back
dev-back: clean
	npx concurrently -n "frontend,backend" -c "blue,green" "cd frontend && pnpm watch" "air"


.PHONY: test
test:
	#cd frontend && pnpm test
	go test -race ./...

lint:
	golangci-lint run
	cd frontend && pnpm run lint



format:
	cd frontend && pnpm exec prettier --write "src/**/*.{js,jsx,css}"

# 本番では、後方互換性のために残しておいたほうが良いかも。
migrate-collections:
	ls -1 migrations/*.go | sort | head -n -1 | xargs rm -f
	yes | go run ./cmd/epoche migrate collections
	ls -1 migrations/*.go | sort | head -n -1 | xargs rm -f
