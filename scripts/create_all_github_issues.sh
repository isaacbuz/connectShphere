#!/bin/bash

# Starling.ai Complete GitHub Issues Creation Script
# This script creates ALL 26 GitHub issues defined in GITHUB_ISSUES.md

# Set your GitHub personal access token
GITHUB_TOKEN="${GITHUB_TOKEN:-$1}"
REPO_OWNER="isaacbuz"
REPO_NAME="connectShphere"

if [ -z "$GITHUB_TOKEN" ]; then
    echo "Please provide your GitHub token as an argument or set GITHUB_TOKEN environment variable"
    echo "Usage: ./create_all_github_issues.sh YOUR_GITHUB_TOKEN"
    exit 1
fi

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counter for issues created
CREATED=0
FAILED=0

# Function to create an issue
create_issue() {
    local title="$1"
    local body="$2"
    local labels="$3"
    
    # Create temporary file for the JSON payload
    TEMP_FILE=$(mktemp)
    
    # Write JSON to temporary file
    cat > "$TEMP_FILE" <<EOF
{
  "title": "$title",
  "body": "$body",
  "labels": [$labels]
}
EOF
    
    # Make API request
    response=$(curl -s -X POST \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        -H "Content-Type: application/json" \
        -d @"$TEMP_FILE" \
        "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/issues")
    
    # Clean up temp file
    rm -f "$TEMP_FILE"
    
    # Check if successful
    if echo "$response" | grep -q '"number"'; then
        issue_number=$(echo "$response" | grep -o '"number":[0-9]*' | cut -d: -f2)
        echo -e "${GREEN}✓ Created issue #$issue_number: $title${NC}"
        ((CREATED++))
    else
        echo -e "${RED}✗ Failed to create issue: $title${NC}"
        echo "Response: $response"
        ((FAILED++))
    fi
}

echo -e "${BLUE}Creating ALL GitHub issues for Starling.ai implementation...${NC}"
echo -e "${BLUE}Repository: $REPO_OWNER/$REPO_NAME${NC}"
echo ""

# Epic 1: Core Infrastructure Setup
echo -e "${BLUE}Epic 1: Core Infrastructure Setup${NC}"

create_issue "Set up comprehensive development environment with Docker and Kubernetes" \
"**Epic:** Core Infrastructure Setup

**Description:**
- Set up Docker containers for all services
- Configure Kubernetes manifests
- Create docker-compose for local development
- Set up environment variables and secrets management

**Acceptance Criteria:**
- [ ] Docker images build successfully
- [ ] Services run in local Kubernetes cluster
- [ ] Environment configuration is documented" \
'"infrastructure", "high-priority"'

create_issue "Create GitHub Actions CI/CD pipeline" \
"**Epic:** Core Infrastructure Setup

**Description:**
- Set up automated testing on PR
- Configure deployment pipelines
- Add code quality checks (linting, formatting)
- Security scanning integration

**Acceptance Criteria:**
- [ ] All tests run on PR
- [ ] Automatic deployment to staging
- [ ] Code quality gates enforced" \
'"devops", "automation"'

# Epic 2: Agentic AI Framework
echo -e "${BLUE}Epic 2: Agentic AI Framework${NC}"

create_issue "Build core LangChain-based agent system" \
"**Epic:** Agentic AI Framework

**Description:**
- Set up LangChain framework
- Implement base agent classes
- Create agent communication protocol
- Build agent registry system

**Acceptance Criteria:**
- [ ] Base agent class implemented
- [ ] Agents can communicate via defined protocol
- [ ] Agent lifecycle management working" \
'"ai", "agents", "high-priority"'

create_issue "Build AI-powered content moderation agent" \
"**Epic:** Agentic AI Framework

**Description:**
- Implement toxicity detection using Perspective API
- Add NSFW content detection
- Integrate fact-checking APIs
- Build moderation decision framework

**Acceptance Criteria:**
- [ ] Toxicity detection accurate to 95%
- [ ] NSFW content filtered
- [ ] Fact-checking integrated
- [ ] Moderation logs stored" \
'"ai", "moderation", "safety"'

create_issue "Implement personalization agent using RAG" \
"**Epic:** Agentic AI Framework

**Description:**
- Set up vector database (Pinecone)
- Implement user embedding generation
- Build RAG pipeline with LlamaIndex
- Create recommendation algorithm

**Acceptance Criteria:**
- [ ] User preferences vectorized
- [ ] RAG pipeline returns relevant content
- [ ] Personalized feed generation working
- [ ] A/B testing framework ready" \
'"ai", "personalization", "rag"'

create_issue "Implement AutoGen for multi-agent collaboration" \
"**Epic:** Agentic AI Framework

**Description:**
- Set up AutoGen framework
- Create agent collaboration scenarios
- Implement group chat functionality
- Build consensus mechanisms

**Acceptance Criteria:**
- [ ] Multiple agents collaborate on tasks
- [ ] Group decisions are logged
- [ ] Consensus algorithms implemented
- [ ] Performance metrics tracked" \
'"ai", "agents", "orchestration"'

create_issue "Integrate CrewAI for specialized agent crews" \
"**Epic:** Agentic AI Framework

**Description:**
- Set up CrewAI framework
- Define agent roles and goals
- Create task assignment system
- Implement crew performance tracking

**Acceptance Criteria:**
- [ ] CrewAI agents deployed
- [ ] Task delegation working
- [ ] Performance metrics available
- [ ] Integration with main system complete" \
'"ai", "agents", "crewai"'

# Epic 3: Blockchain Integration
echo -e "${BLUE}Epic 3: Blockchain Integration${NC}"

create_issue "Develop core smart contracts in Solidity" \
"**Epic:** Blockchain Integration

**Description:**
- Content ownership contract
- DOGE payment integration
- User identity management
- Governance token contract

**Acceptance Criteria:**
- [ ] Contracts deployed to testnet
- [ ] Security audit passed
- [ ] Gas optimization complete
- [ ] Integration tests passing" \
'"blockchain", "smart-contracts", "high-priority"'

create_issue "Implement Polygon/Arbitrum integration" \
"**Epic:** Blockchain Integration

**Description:**
- Set up Polygon SDK
- Configure Arbitrum bridge
- Implement cross-chain communication
- Optimize for low gas fees

**Acceptance Criteria:**
- [ ] Transactions on L2 working
- [ ] Bridge functionality tested
- [ ] Gas costs reduced by 90%
- [ ] Failover mechanisms in place" \
'"blockchain", "scaling", "layer2"'

create_issue "Implement IPFS for decentralized storage" \
"**Epic:** Blockchain Integration

**Description:**
- Set up IPFS nodes
- Implement content pinning
- Create retrieval mechanisms
- Build redundancy system

**Acceptance Criteria:**
- [ ] Content stored on IPFS
- [ ] Retrieval < 100ms
- [ ] Redundancy across 3+ nodes
- [ ] Garbage collection configured" \
'"storage", "ipfs", "decentralization"'

# Epic 4: AI/ML Models
echo -e "${BLUE}Epic 4: AI/ML Models${NC}"

create_issue "Integrate GPT-4, Claude 3, and LLaMA models" \
"**Epic:** AI/ML Models

**Description:**
- Set up OpenAI API integration
- Configure Anthropic Claude access
- Deploy local LLaMA 3 with quantization
- Implement model routing logic

**Acceptance Criteria:**
- [ ] All APIs integrated
- [ ] Local model serving working
- [ ] Fallback mechanisms in place
- [ ] Cost optimization implemented" \
'"ai", "models", "llm"'

create_issue "Build image/video analysis pipeline" \
"**Epic:** AI/ML Models

**Description:**
- Integrate CLIP for image understanding
- Set up Stable Diffusion XL
- Implement NSFW detection
- Build image tagging system

**Acceptance Criteria:**
- [ ] Image analysis < 500ms
- [ ] Auto-tagging accuracy > 90%
- [ ] NSFW detection working
- [ ] GPU optimization complete" \
'"ai", "computer-vision", "media"'

create_issue "Build transformer-based recommendation engine" \
"**Epic:** AI/ML Models

**Description:**
- Implement two-tower neural network
- Build user/content embeddings
- Create real-time inference pipeline
- Set up A/B testing framework

**Acceptance Criteria:**
- [ ] CTR improvement > 25%
- [ ] Inference < 50ms
- [ ] Embeddings updated hourly
- [ ] A/B tests automated" \
'"ai", "recommendations", "ml"'

create_issue "Implement privacy-preserving federated learning" \
"**Epic:** AI/ML Models

**Description:**
- Set up federated learning framework
- Implement differential privacy
- Build secure aggregation
- Create model update protocol

**Acceptance Criteria:**
- [ ] On-device training working
- [ ] Privacy guarantees met
- [ ] Model convergence achieved
- [ ] Bandwidth optimized" \
'"ai", "privacy", "federated-learning"'

# Epic 5: Testing Framework
echo -e "${BLUE}Epic 5: Testing Framework${NC}"

create_issue "Comprehensive unit tests for all components" \
"**Epic:** Testing Framework

**Description:**
- Agent behavior tests
- Smart contract tests
- API endpoint tests
- ML model tests

**Acceptance Criteria:**
- [ ] 90% code coverage
- [ ] All edge cases covered
- [ ] Tests run in < 5 minutes
- [ ] Mocking framework ready" \
'"testing", "quality", "required"'

create_issue "End-to-end integration test suite" \
"**Epic:** Testing Framework

**Description:**
- Multi-agent interaction tests
- Blockchain integration tests
- Full user journey tests
- Performance benchmarks

**Acceptance Criteria:**
- [ ] All workflows tested
- [ ] Load tests passing
- [ ] Latency requirements met
- [ ] Failure scenarios covered" \
'"testing", "integration", "e2e"'

create_issue "Specialized testing for AI/ML components" \
"**Epic:** Testing Framework

**Description:**
- Model drift detection
- Bias and fairness testing
- Adversarial testing
- Performance regression tests

**Acceptance Criteria:**
- [ ] Drift detection automated
- [ ] Bias metrics tracked
- [ ] Robustness verified
- [ ] Performance baselines set" \
'"testing", "ai", "ml"'

# Epic 6: Security & Compliance
echo -e "${BLUE}Epic 6: Security & Compliance${NC}"

create_issue "Implement comprehensive security measures" \
"**Epic:** Security & Compliance

**Description:**
- Smart contract auditing
- API security (rate limiting, auth)
- Encryption at rest/transit
- Security monitoring

**Acceptance Criteria:**
- [ ] Audit reports clean
- [ ] OWASP top 10 addressed
- [ ] Encryption implemented
- [ ] Monitoring alerts working" \
'"security", "high-priority", "compliance"'

create_issue "Implement AI safety and alignment features" \
"**Epic:** Security & Compliance

**Description:**
- Constitutional AI implementation
- Jailbreak prevention
- Content watermarking
- Bias mitigation

**Acceptance Criteria:**
- [ ] Safety checks integrated
- [ ] Jailbreak attempts blocked
- [ ] AI content marked
- [ ] Bias metrics acceptable" \
'"ai-safety", "ethics", "required"'

create_issue "GDPR and privacy regulation compliance" \
"**Epic:** Security & Compliance

**Description:**
- Data deletion mechanisms
- Consent management
- Privacy policy automation
- Audit trail system

**Acceptance Criteria:**
- [ ] GDPR compliant
- [ ] Right to deletion working
- [ ] Consent tracked
- [ ] Audit logs complete" \
'"privacy", "compliance", "legal"'

# Epic 7: Performance Optimization
echo -e "${BLUE}Epic 7: Performance Optimization${NC}"

create_issue "Optimize AI models for production" \
"**Epic:** Performance Optimization

**Description:**
- Model quantization (INT8/INT4)
- Knowledge distillation
- Pruning implementation
- Edge deployment prep

**Acceptance Criteria:**
- [ ] Model size reduced 75%
- [ ] Inference speed 3x faster
- [ ] Accuracy drop < 2%
- [ ] Edge deployment ready" \
'"performance", "ai", "optimization"'

create_issue "Implement auto-scaling and optimization" \
"**Epic:** Performance Optimization

**Description:**
- Kubernetes HPA setup
- Database sharding
- Cache optimization
- CDN configuration

**Acceptance Criteria:**
- [ ] Auto-scaling working
- [ ] Database queries < 50ms
- [ ] Cache hit rate > 90%
- [ ] Global latency < 100ms" \
'"infrastructure", "scaling", "performance"'

# Epic 8: Frontend Development
echo -e "${BLUE}Epic 8: Frontend Development${NC}"

create_issue "Build modern React frontend with Web3" \
"**Epic:** Frontend Development

**Description:**
- React 18 with TypeScript
- Web3 wallet integration
- Real-time updates
- Responsive design

**Acceptance Criteria:**
- [ ] Wallet connection working
- [ ] Real-time feed updates
- [ ] Mobile responsive
- [ ] Accessibility compliant" \
'"frontend", "ui", "web3"'

create_issue "React Native mobile application" \
"**Epic:** Frontend Development

**Description:**
- iOS and Android apps
- Push notifications
- Offline support
- Native performance

**Acceptance Criteria:**
- [ ] Apps published to stores
- [ ] Performance smooth
- [ ] Offline mode working
- [ ] Push notifications live" \
'"mobile", "react-native", "apps"'

# Epic 9: Monitoring & Analytics
echo -e "${BLUE}Epic 9: Monitoring & Analytics${NC}"

create_issue "Set up monitoring and observability" \
"**Epic:** Monitoring & Analytics

**Description:**
- Prometheus + Grafana setup
- Custom AI metrics
- Business analytics
- Alert system

**Acceptance Criteria:**
- [ ] All services monitored
- [ ] AI metrics tracked
- [ ] Dashboards created
- [ ] Alerts configured" \
'"monitoring", "devops", "observability"'

create_issue "MLOps pipeline with experiment tracking" \
"**Epic:** Monitoring & Analytics

**Description:**
- Weights & Biases integration
- MLflow setup
- Model versioning
- A/B test tracking

**Acceptance Criteria:**
- [ ] Experiments tracked
- [ ] Models versioned
- [ ] Rollback capability
- [ ] Performance compared" \
'"mlops", "ai", "tracking"'

echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "${GREEN}Successfully created: $CREATED issues${NC}"
echo -e "${RED}Failed to create: $FAILED issues${NC}"
echo ""
echo "Visit https://github.com/$REPO_OWNER/$REPO_NAME/issues to view all issues." 