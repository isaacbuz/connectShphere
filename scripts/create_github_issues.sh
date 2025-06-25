#!/bin/bash

# ConnectSphere GitHub Issues Creation Script
# This script creates all the GitHub issues defined in GITHUB_ISSUES.md

# Set your GitHub personal access token
GITHUB_TOKEN="${GITHUB_TOKEN:-$1}"
REPO_OWNER="isaacbuz"
REPO_NAME="connectShphere"

if [ -z "$GITHUB_TOKEN" ]; then
    echo "Please provide your GitHub token as an argument or set GITHUB_TOKEN environment variable"
    echo "Usage: ./create_github_issues.sh YOUR_GITHUB_TOKEN"
    exit 1
fi

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to create an issue
create_issue() {
    local title="$1"
    local body="$2"
    local labels="$3"
    
    # Escape special characters in JSON
    title=$(echo "$title" | sed 's/"/\\"/g')
    body=$(echo "$body" | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
    
    # Create JSON payload
    json_payload=$(cat <<EOF
{
  "title": "$title",
  "body": "$body",
  "labels": [$labels]
}
EOF
)
    
    # Make API request
    response=$(curl -s -X POST \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        -H "Content-Type: application/json" \
        -d "$json_payload" \
        "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/issues")
    
    # Check if successful
    if echo "$response" | grep -q '"number"'; then
        issue_number=$(echo "$response" | grep -o '"number":[0-9]*' | cut -d: -f2)
        echo -e "${GREEN}✓ Created issue #$issue_number: $title${NC}"
    else
        echo -e "${RED}✗ Failed to create issue: $title${NC}"
        echo "Response: $response"
    fi
}

echo "Creating GitHub issues for ConnectSphere implementation..."
echo "Repository: $REPO_OWNER/$REPO_NAME"
echo ""

# Epic 1: Core Infrastructure Setup
create_issue "Set up comprehensive development environment with Docker and Kubernetes" \
"**Epic:** Core Infrastructure Setup\\n\\n**Description:**\\n- Set up Docker containers for all services\\n- Configure Kubernetes manifests\\n- Create docker-compose for local development\\n- Set up environment variables and secrets management\\n\\n**Acceptance Criteria:**\\n- [ ] Docker images build successfully\\n- [ ] Services run in local Kubernetes cluster\\n- [ ] Environment configuration is documented" \
'"infrastructure", "high-priority"'

create_issue "Create GitHub Actions CI/CD pipeline" \
"**Epic:** Core Infrastructure Setup\\n\\n**Description:**\\n- Set up automated testing on PR\\n- Configure deployment pipelines\\n- Add code quality checks (linting, formatting)\\n- Security scanning integration\\n\\n**Acceptance Criteria:**\\n- [ ] All tests run on PR\\n- [ ] Automatic deployment to staging\\n- [ ] Code quality gates enforced" \
'"devops", "automation"'

# Epic 2: Agentic AI Framework
create_issue "Build core LangChain-based agent system" \
"**Epic:** Agentic AI Framework\\n\\n**Description:**\\n- Set up LangChain framework\\n- Implement base agent classes\\n- Create agent communication protocol\\n- Build agent registry system\\n\\n**Acceptance Criteria:**\\n- [ ] Base agent class implemented\\n- [ ] Agents can communicate via defined protocol\\n- [ ] Agent lifecycle management working" \
'"ai", "agents", "high-priority"'

create_issue "Build AI-powered content moderation agent" \
"**Epic:** Agentic AI Framework\\n\\n**Description:**\\n- Implement toxicity detection using Perspective API\\n- Add NSFW content detection\\n- Integrate fact-checking APIs\\n- Build moderation decision framework\\n\\n**Acceptance Criteria:**\\n- [ ] Toxicity detection accurate to 95%\\n- [ ] NSFW content filtered\\n- [ ] Fact-checking integrated\\n- [ ] Moderation logs stored" \
'"ai", "moderation", "safety"'

create_issue "Implement personalization agent using RAG" \
"**Epic:** Agentic AI Framework\\n\\n**Description:**\\n- Set up vector database (Pinecone)\\n- Implement user embedding generation\\n- Build RAG pipeline with LlamaIndex\\n- Create recommendation algorithm\\n\\n**Acceptance Criteria:**\\n- [ ] User preferences vectorized\\n- [ ] RAG pipeline returns relevant content\\n- [ ] Personalized feed generation working\\n- [ ] A/B testing framework ready" \
'"ai", "personalization", "rag"'

create_issue "Implement AutoGen for multi-agent collaboration" \
"**Epic:** Agentic AI Framework\\n\\n**Description:**\\n- Set up AutoGen framework\\n- Create agent collaboration scenarios\\n- Implement group chat functionality\\n- Build consensus mechanisms\\n\\n**Acceptance Criteria:**\\n- [ ] Multiple agents collaborate on tasks\\n- [ ] Group decisions are logged\\n- [ ] Consensus algorithms implemented\\n- [ ] Performance metrics tracked" \
'"ai", "agents", "orchestration"'

create_issue "Integrate CrewAI for specialized agent crews" \
"**Epic:** Agentic AI Framework\\n\\n**Description:**\\n- Set up CrewAI framework\\n- Define agent roles and goals\\n- Create task assignment system\\n- Implement crew performance tracking\\n\\n**Acceptance Criteria:**\\n- [ ] CrewAI agents deployed\\n- [ ] Task delegation working\\n- [ ] Performance metrics available\\n- [ ] Integration with main system complete" \
'"ai", "agents", "crewai"'

# Epic 3: Blockchain Integration
create_issue "Develop core smart contracts in Solidity" \
"**Epic:** Blockchain Integration\\n\\n**Description:**\\n- Content ownership contract\\n- DOGE payment integration\\n- User identity management\\n- Governance token contract\\n\\n**Acceptance Criteria:**\\n- [ ] Contracts deployed to testnet\\n- [ ] Security audit passed\\n- [ ] Gas optimization complete\\n- [ ] Integration tests passing" \
'"blockchain", "smart-contracts", "high-priority"'

create_issue "Implement Polygon/Arbitrum integration" \
"**Epic:** Blockchain Integration\\n\\n**Description:**\\n- Set up Polygon SDK\\n- Configure Arbitrum bridge\\n- Implement cross-chain communication\\n- Optimize for low gas fees\\n\\n**Acceptance Criteria:**\\n- [ ] Transactions on L2 working\\n- [ ] Bridge functionality tested\\n- [ ] Gas costs reduced by 90%\\n- [ ] Failover mechanisms in place" \
'"blockchain", "scaling", "layer2"'

create_issue "Implement IPFS for decentralized storage" \
"**Epic:** Blockchain Integration\\n\\n**Description:**\\n- Set up IPFS nodes\\n- Implement content pinning\\n- Create retrieval mechanisms\\n- Build redundancy system\\n\\n**Acceptance Criteria:**\\n- [ ] Content stored on IPFS\\n- [ ] Retrieval < 100ms\\n- [ ] Redundancy across 3+ nodes\\n- [ ] Garbage collection configured" \
'"storage", "ipfs", "decentralization"'

# Add more issues as needed...

echo ""
echo "Issue creation completed!"
echo "Visit https://github.com/$REPO_OWNER/$REPO_NAME/issues to view all issues." 