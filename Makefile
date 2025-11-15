# Pizza Pipeline - Makefile
# Simplify common tasks

.PHONY: help setup deploy run check clean logs

# Variables
PROJECT_ID ?= build-unicorn25par-4813
REGION ?= europe-west1
WEEK ?= $(shell date +'%G-W%V')

help: ## Show this help message
	@echo "Pizza Pipeline - Available commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Environment variables:"
	@echo "  PROJECT_ID=$(PROJECT_ID)"
	@echo "  REGION=$(REGION)"
	@echo "  WEEK=$(WEEK)"

setup: ## Setup GCP infrastructure (run once)
	@echo "🚀 Setting up GCP infrastructure..."
	@export PROJECT_ID=$(PROJECT_ID) REGION=$(REGION) && ./setup.sh

deploy: ## Build and deploy the pipeline to Cloud Run
	@echo "📦 Building and deploying pipeline..."
	@export PROJECT_ID=$(PROJECT_ID) REGION=$(REGION) && ./deploy.sh

run: ## Run the pipeline manually for current week
	@echo "▶️  Running pipeline for week $(WEEK)..."
	@export PROJECT_ID=$(PROJECT_ID) REGION=$(REGION) && ./run_pipeline.sh $(WEEK)

check: ## Check results for current week
	@echo "🔍 Checking results for week $(WEEK)..."
	@export PROJECT_ID=$(PROJECT_ID) && ./check_results.sh $(WEEK)

logs: ## Show recent pipeline logs
	@echo "📋 Fetching recent logs..."
	@gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=pz-weekly-pipeline" \
		--limit 50 \
		--format "table(timestamp, severity, textPayload)" \
		--project=$(PROJECT_ID)

status: ## Show GCP resources status
	@echo "📊 GCP Resources Status"
	@echo ""
	@echo "Buckets:"
	@gsutil ls -p $(PROJECT_ID) | grep "pz-" || echo "No buckets found"
	@echo ""
	@echo "Cloud Run Jobs:"
	@gcloud run jobs list --project=$(PROJECT_ID) --region=$(REGION)
	@echo ""
	@echo "Workflows:"
	@gcloud workflows list --project=$(PROJECT_ID) --location=$(REGION)

test-upload: ## Upload a test audio file (usage: make test-upload FILE=path/to/audio.wav)
	@if [ -z "$(FILE)" ]; then \
		echo "❌ Please specify FILE=path/to/audio.wav"; \
		exit 1; \
	fi
	@echo "⬆️  Uploading test file..."
	@export PROJECT_ID=$(PROJECT_ID) && ./upload_test_audio.sh $(WEEK) $(FILE)

clean: ## Clean local temporary files
	@echo "🧹 Cleaning temporary files..."
	@rm -rf ./reports/
	@rm -rf /tmp/pz-*
	@echo "✅ Clean completed"

validate: ## Validate JSON schemas
	@echo "✅ Validating JSON schemas..."
	@for file in schemas/*.json; do \
		echo "Checking $$file..."; \
		python3 -m json.tool $$file > /dev/null && echo "  ✓ Valid" || echo "  ✗ Invalid"; \
	done

env: ## Create .env file from template
	@if [ -f .env ]; then \
		echo "⚠️  .env file already exists"; \
	else \
		cp .env.example .env; \
		echo "✅ Created .env file from template"; \
		echo "📝 Please edit .env and fill in your values"; \
	fi

.DEFAULT_GOAL := help
