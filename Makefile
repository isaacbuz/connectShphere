.PHONY: help install dev build test clean docker-up docker-down deploy-contracts create-issues

# Default target
help:
	@echo "ConnectSphere Project Commands:"
	@echo "  make install          - Install all dependencies"
	@echo "  make dev             - Start development environment"
	@echo "  make build           - Build production artifacts"
	@echo "  make test            - Run all tests"
	@echo "  make clean           - Clean build artifacts"
	@echo "  make docker-up       - Start Docker services"
	@echo "  make docker-down     - Stop Docker services"
	@echo "  make deploy-contracts - Deploy smart contracts"
	@echo "  make create-issues   - Create GitHub issues (requires GITHUB_TOKEN)"

# Install dependencies
install:
	@echo "Installing Node.js dependencies..."
	npm install
	@echo "Installing Python dependencies..."
	pip install -r requirements.txt
	@echo "Installing smart contract dependencies..."
	cd src/blockchain && npm install
	@echo "Dependencies installed successfully!"

# Development environment
dev:
	@echo "Starting development environment..."
	docker-compose up -d mongodb redis kafka zookeeper ipfs
	@echo "Waiting for services to start..."
	sleep 10
	@echo "Starting backend server..."
	npm run dev:backend &
	@echo "Starting AI agents..."
	python src/agents/main.py &
	@echo "Starting frontend..."
	npm run dev:frontend
	@echo "Development environment started!"

# Build production artifacts
build:
	@echo "Building production artifacts..."
	npm run build
	@echo "Building Docker images..."
	docker build -f Dockerfile.backend -t connectsphere/backend:latest .
	docker build -f Dockerfile.agents -t connectsphere/agents:latest .
	@echo "Compiling smart contracts..."
	npx hardhat compile
	@echo "Build complete!"

# Run tests
test:
	@echo "Running Node.js tests..."
	npm test
	@echo "Running Python tests..."
	pytest src/tests/test_agents.py -v
	@echo "Running smart contract tests..."
	npx hardhat test
	@echo "All tests complete!"

# Run specific test suites
test-node:
	npm test

test-python:
	pytest src/tests/test_agents.py -v

test-contracts:
	npx hardhat test

# Linting and formatting
lint:
	@echo "Linting JavaScript/TypeScript..."
	npm run lint
	@echo "Linting Python..."
	flake8 src/agents --max-line-length=100
	black src/agents --check
	@echo "Linting complete!"

format:
	@echo "Formatting JavaScript/TypeScript..."
	npm run format
	@echo "Formatting Python..."
	black src/agents
	@echo "Formatting complete!"

# Docker commands
docker-up:
	docker-compose up -d
	@echo "Docker services started!"
	@echo "Monitoring available at:"
	@echo "  - Grafana: http://localhost:3001"
	@echo "  - Prometheus: http://localhost:9090"
	@echo "  - IPFS: http://localhost:5001"

docker-down:
	docker-compose down
	@echo "Docker services stopped!"

docker-logs:
	docker-compose logs -f

# Smart contract deployment
deploy-contracts:
	@echo "Deploying smart contracts..."
	npx hardhat run scripts/deploy.js --network localhost
	@echo "Contracts deployed!"

deploy-testnet:
	@echo "Deploying to Mumbai testnet..."
	npx hardhat run scripts/deploy.js --network mumbai
	@echo "Testnet deployment complete!"

# GitHub issues creation
create-issues:
ifndef GITHUB_TOKEN
	@echo "Error: GITHUB_TOKEN is not set"
	@echo "Usage: GITHUB_TOKEN=your_token make create-issues"
	@exit 1
endif
	@echo "Creating GitHub issues..."
	chmod +x scripts/create_all_github_issues.sh
	./scripts/create_all_github_issues.sh $(GITHUB_TOKEN)

# Database operations
db-migrate:
	@echo "Running database migrations..."
	npm run migrate
	@echo "Migrations complete!"

db-seed:
	@echo "Seeding database..."
	npm run seed
	@echo "Database seeded!"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf node_modules
	rm -rf src/agents/__pycache__
	rm -rf dist
	rm -rf build
	rm -rf coverage
	rm -rf .pytest_cache
	rm -rf artifacts
	rm -rf cache
	rm -rf typechain
	rm -rf typechain-types
	@echo "Clean complete!"

# Security checks
security:
	@echo "Running security checks..."
	npm audit
	pip-audit
	@echo "Security checks complete!"

# Performance testing
perf-test:
	@echo "Running performance tests..."
	npm run test:perf
	@echo "Performance tests complete!"

# Generate documentation
docs:
	@echo "Generating documentation..."
	npm run docs
	@echo "Documentation generated in docs/ directory!"

# Quick setup for new developers
setup: install
	@echo "Setting up development environment..."
	cp env.example .env
	@echo "Please edit .env with your configuration"
	@echo "Setup complete! Run 'make dev' to start developing."

# Production deployment
deploy-prod:
	@echo "Deploying to production..."
	@echo "This would deploy to production (not implemented)"
	@echo "Please use your CI/CD pipeline for production deployments"

# Monitor logs
logs-backend:
	docker-compose logs -f backend

logs-agents:
	docker-compose logs -f agents

logs-all:
	docker-compose logs -f 