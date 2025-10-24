#!/bin/bash

# RugFork Deployment Script
# This script deploys the RugFork platform to various environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-devnet}
CLUSTER_URL=""
PROGRAM_ID=""

# Set cluster URL based on environment
case $ENVIRONMENT in
  "devnet")
    CLUSTER_URL="https://api.devnet.solana.com"
    PROGRAM_ID="RugForkProgram111111111111111111111111111111"
    ;;
  "testnet")
    CLUSTER_URL="https://api.testnet.solana.com"
    PROGRAM_ID="RugForkProgram111111111111111111111111111111"
    ;;
  "mainnet")
    CLUSTER_URL="https://api.mainnet-beta.solana.com"
    PROGRAM_ID="RugForkProgram111111111111111111111111111111"
    ;;
  *)
    echo -e "${RED}Invalid environment. Use: devnet, testnet, or mainnet${NC}"
    exit 1
    ;;
esac

echo -e "${BLUE}🚀 Deploying RugFork to ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Cluster URL: ${CLUSTER_URL}${NC}"
echo -e "${BLUE}Program ID: ${PROGRAM_ID}${NC}"

# Check if required tools are installed
check_dependencies() {
  echo -e "${YELLOW}📋 Checking dependencies...${NC}"
  
  if ! command -v solana &> /dev/null; then
    echo -e "${RED}❌ Solana CLI not found. Please install it first.${NC}"
    exit 1
  fi
  
  if ! command -v anchor &> /dev/null; then
    echo -e "${RED}❌ Anchor CLI not found. Please install it first.${NC}"
    exit 1
  fi
  
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install it first.${NC}"
    exit 1
  fi
  
  if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not found. Please install it first.${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✅ All dependencies found${NC}"
}

# Configure Solana CLI
configure_solana() {
  echo -e "${YELLOW}⚙️  Configuring Solana CLI...${NC}"
  
  solana config set --url $CLUSTER_URL
  
  # Check if wallet exists
  if [ ! -f ~/.config/solana/id.json ]; then
    echo -e "${YELLOW}🔑 Creating new wallet...${NC}"
    solana-keygen new --no-bip39-passphrase -o ~/.config/solana/id.json
  fi
  
  # Get wallet balance
  BALANCE=$(solana balance)
  echo -e "${BLUE}💰 Wallet balance: ${BALANCE} SOL${NC}"
  
  # Airdrop SOL for devnet/testnet
  if [ "$ENVIRONMENT" != "mainnet" ]; then
    echo -e "${YELLOW}💸 Requesting airdrop...${NC}"
    solana airdrop 2
    BALANCE=$(solana balance)
    echo -e "${GREEN}✅ New balance: ${BALANCE} SOL${NC}"
  fi
}

# Deploy smart contracts
deploy_contracts() {
  echo -e "${YELLOW}📦 Deploying smart contracts...${NC}"
  
  cd contracts
  
  # Build contracts
  echo -e "${BLUE}🔨 Building contracts...${NC}"
  anchor build
  
  # Deploy contracts
  echo -e "${BLUE}🚀 Deploying to ${ENVIRONMENT}...${NC}"
  anchor deploy --provider.cluster $ENVIRONMENT
  
  # Get program ID
  DEPLOYED_PROGRAM_ID=$(solana address -k target/deploy/rugfork-keypair.json)
  echo -e "${GREEN}✅ Contract deployed with Program ID: ${DEPLOYED_PROGRAM_ID}${NC}"
  
  cd ..
}

# Build and deploy backend
deploy_backend() {
  echo -e "${YELLOW}🖥️  Deploying backend...${NC}"
  
  cd backend
  
  # Install dependencies
  echo -e "${BLUE}📦 Installing dependencies...${NC}"
  npm install
  
  # Generate Prisma client
  echo -e "${BLUE}🗄️  Generating Prisma client...${NC}"
  npx prisma generate
  
  # Run database migrations
  echo -e "${BLUE}🔄 Running database migrations...${NC}"
  npx prisma db push
  
  # Build application
  echo -e "${BLUE}🔨 Building application...${NC}"
  npm run build
  
  cd ..
}

# Build and deploy frontend
deploy_frontend() {
  echo -e "${YELLOW}🌐 Deploying frontend...${NC}"
  
  cd frontend
  
  # Install dependencies
  echo -e "${BLUE}📦 Installing dependencies...${NC}"
  npm install
  
  # Build application
  echo -e "${BLUE}🔨 Building application...${NC}"
  npm run build
  
  cd ..
}

# Deploy with Docker
deploy_docker() {
  echo -e "${YELLOW}🐳 Deploying with Docker...${NC}"
  
  # Build images
  echo -e "${BLUE}🔨 Building Docker images...${NC}"
  docker-compose build
  
  # Start services
  echo -e "${BLUE}🚀 Starting services...${NC}"
  docker-compose up -d
  
  # Wait for services to be ready
  echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
  sleep 30
  
  # Check service health
  echo -e "${BLUE}🏥 Checking service health...${NC}"
  docker-compose ps
}

# Run tests
run_tests() {
  echo -e "${YELLOW}🧪 Running tests...${NC}"
  
  # Test contracts
  echo -e "${BLUE}📋 Testing contracts...${NC}"
  cd contracts && anchor test && cd ..
  
  # Test backend
  echo -e "${BLUE}📋 Testing backend...${NC}"
  cd backend && npm test && cd ..
  
  # Test frontend
  echo -e "${BLUE}📋 Testing frontend...${NC}"
  cd frontend && npm test && cd ..
  
  echo -e "${GREEN}✅ All tests passed${NC}"
}

# Main deployment function
main() {
  echo -e "${GREEN}🎯 Starting RugFork deployment to ${ENVIRONMENT}${NC}"
  
  check_dependencies
  configure_solana
  deploy_contracts
  deploy_backend
  deploy_frontend
  
  if [ "$ENVIRONMENT" = "devnet" ]; then
    deploy_docker
    run_tests
  fi
  
  echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
  echo -e "${BLUE}📊 Backend API: http://localhost:3000${NC}"
  echo -e "${BLUE}🌐 Frontend: http://localhost:3001${NC}"
  echo -e "${BLUE}🗄️  Database: localhost:5432${NC}"
  echo -e "${BLUE}📈 Redis: localhost:6379${NC}"
}

# Run main function
main
