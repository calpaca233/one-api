.PHONY: build build-frontend build-backend clean test run help

# 获取版本号
VERSION := $(shell cat VERSION)
BUILDTIME := $(shell date -u '+%Y-%m-%d_%H:%M:%S')
GOOS := $(shell go env GOOS)
GOARCH := $(shell go env GOARCH)

# 默认目标
.DEFAULT_GOAL := help

help: ## 显示帮助信息
	@echo "可用的命令:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: build-frontend build-backend ## 构建前后端项目

build-frontend: ## 构建前端项目
	@echo "Building frontend..."
	@cd web && bun install && bun run build
	@echo "Frontend build completed!"

build-backend: ## 构建后端项目
	@echo "Building backend..."
	@go build -ldflags "-s -w -X 'one-api/common.Version=$(VERSION)' -X 'one-api/common.BuildTime=$(BUILDTIME)'" -o one-api
	@echo "Backend build completed! Output: one-api"

build-linux: build-frontend ## 构建 Linux 版本
	@echo "Building backend for Linux..."
	@CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags "-s -w -X 'one-api/common.Version=$(VERSION)' -X 'one-api/common.BuildTime=$(BUILDTIME)'" -o one-api-linux-amd64
	@echo "Linux build completed! Output: one-api-linux-amd64"

build-windows: build-frontend ## 构建 Windows 版本
	@echo "Building backend for Windows..."
	@CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags "-s -w -X 'one-api/common.Version=$(VERSION)' -X 'one-api/common.BuildTime=$(BUILDTIME)'" -o one-api-windows-amd64.exe
	@echo "Windows build completed! Output: one-api-windows-amd64.exe"

build-darwin: build-frontend ## 构建 macOS 版本
	@echo "Building backend for macOS..."
	@CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -ldflags "-s -w -X 'one-api/common.Version=$(VERSION)' -X 'one-api/common.BuildTime=$(BUILDTIME)'" -o one-api-darwin-amd64
	@CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -ldflags "-s -w -X 'one-api/common.Version=$(VERSION)' -X 'one-api/common.BuildTime=$(BUILDTIME)'" -o one-api-darwin-arm64
	@echo "macOS build completed! Output: one-api-darwin-amd64, one-api-darwin-arm64"

build-all: build-frontend build-linux build-windows build-darwin ## 构建所有平台版本

clean: ## 清理构建文件
	@echo "Cleaning..."
	@rm -f one-api one-api-*
	@rm -rf web/dist web/node_modules
	@echo "Clean completed!"

test: ## 运行测试
	@echo "Running tests..."
	@go test -v ./...

run: build ## 构建并运行
	@echo "Starting one-api..."
	@./one-api

dev-frontend: ## 启动前端开发服务器
	@cd web && npm run dev

dev-backend: ## 启动后端开发服务器
	@go run main.go

docker-build: ## 构建 Docker 镜像
	@echo "Building Docker image..."
	@docker build --build-arg VERSION=$(VERSION) -t one-api:$(VERSION) -t one-api:latest .
	@echo "Docker image built: one-api:$(VERSION)"

docker-run: ## 运行 Docker 容器
	@docker-compose up -d

docker-stop: ## 停止 Docker 容器
	@docker-compose down

version: ## 显示版本信息
	@echo "Version: $(VERSION)"
	@echo "Build Time: $(BUILDTIME)"
	@echo "GOOS: $(GOOS)"
	@echo "GOARCH: $(GOARCH)"
