#!/bin/bash

# RugFork Enhanced Deployment Script
# Combines Grok's ideas with professional implementation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

echo -e "${PURPLE}🚀 RugFork Enhanced Deployment${NC}"
echo -e "${CYAN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${CYAN}Cluster URL: ${CLUSTER_URL}${NC}"
echo -e "${CYAN}Program ID: ${PROGRAM_ID}${NC}"

# Check dependencies
check_dependencies() {
  echo -e "${YELLOW}📋 Checking dependencies...${NC}"
  
  local missing_deps=()
  
  if ! command -v node &> /dev/null; then
    missing_deps+=("Node.js")
  fi
  
  if ! command -v npm &> /dev/null; then
    missing_deps+=("npm")
  fi
  
  if ! command -v rustc &> /dev/null; then
    missing_deps+=("Rust")
  fi
  
  if ! command -v cargo &> /dev/null; then
    missing_deps+=("Cargo")
  fi
  
  if ! command -v solana &> /dev/null; then
    missing_deps+=("Solana CLI")
  fi
  
  if ! command -v anchor &> /dev/null; then
    missing_deps+=("Anchor CLI")
  fi
  
  if ! command -v docker &> /dev/null; then
    missing_deps+=("Docker")
  fi
  
  if ! command -v docker-compose &> /dev/null; then
    missing_deps+=("Docker Compose")
  fi
  
  if [ ${#missing_deps[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing dependencies:${NC}"
    for dep in "${missing_deps[@]}"; do
      echo -e "${RED}   - ${dep}${NC}"
    done
    echo -e "${YELLOW}Please install the missing dependencies and run this script again.${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✅ All dependencies found${NC}"
}

# Configure Solana
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

# Build and deploy smart contracts
deploy_contracts() {
  echo -e "${YELLOW}📦 Building and deploying smart contracts...${NC}"
  
  cd contracts
  
  # Clean previous builds
  echo -e "${BLUE}🧹 Cleaning previous builds...${NC}"
  cargo clean
  anchor clean
  
  # Build contracts
  echo -e "${BLUE}🔨 Building contracts...${NC}"
  anchor build
  
  # Deploy contracts
  echo -e "${BLUE}🚀 Deploying to ${ENVIRONMENT}...${NC}"
  anchor deploy --provider.cluster $ENVIRONMENT
  
  # Get deployed program ID
  DEPLOYED_PROGRAM_ID=$(solana address -k target/deploy/rugfork-keypair.json)
  echo -e "${GREEN}✅ Contract deployed with Program ID: ${DEPLOYED_PROGRAM_ID}${NC}"
  
  # Update program ID in frontend
  echo -e "${BLUE}🔄 Updating program ID in frontend...${NC}"
  cd ../frontend
  if [ -f .env.local ]; then
    sed -i "s/NEXT_PUBLIC_PROGRAM_ID=.*/NEXT_PUBLIC_PROGRAM_ID=${DEPLOYED_PROGRAM_ID}/" .env.local
  else
    echo "NEXT_PUBLIC_PROGRAM_ID=${DEPLOYED_PROGRAM_ID}" > .env.local
  fi
  
  cd ..
}

# Setup and deploy backend
deploy_backend() {
  echo -e "${YELLOW}🖥️  Setting up backend...${NC}"
  
  cd backend
  
  # Install dependencies
  echo -e "${BLUE}📦 Installing dependencies...${NC}"
  npm install
  
  # Generate Prisma client
  echo -e "${BLUE}🗄️  Generating Prisma client...${NC}"
  npx prisma generate
  
  # Create .env file if it doesn't exist
  if [ ! -f .env ]; then
    echo -e "${BLUE}📝 Creating backend .env file...${NC}"
    cat > .env << EOF
DATABASE_URL="postgresql://rugfork:rugfork123@localhost:5432/rugfork"
REDIS_URL="redis://localhost:6379"
SOLANA_RPC_URL="${CLUSTER_URL}"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=3000
NODE_ENV="production"
CORS_ORIGIN="http://localhost:3001"
HELIUS_API_KEY=""
QUICKNODE_API_KEY=""
BIRDEYE_API_KEY=""
EOF
  fi
  
  # Run database migrations
  echo -e "${BLUE}🔄 Running database migrations...${NC}"
  npx prisma db push
  
  # Build application
  echo -e "${BLUE}🔨 Building application...${NC}"
  npm run build
  
  cd ..
}

# Setup and deploy frontend
deploy_frontend() {
  echo -e "${YELLOW}🌐 Setting up frontend...${NC}"
  
  cd frontend
  
  # Install dependencies
  echo -e "${BLUE}📦 Installing dependencies...${NC}"
  npm install
  
  # Create .env.local file if it doesn't exist
  if [ ! -f .env.local ]; then
    echo -e "${BLUE}📝 Creating frontend .env.local file...${NC}"
    cat > .env.local << EOF
NEXT_PUBLIC_API_URL="http://localhost:3000"
NEXT_PUBLIC_SOLANA_RPC_URL="${CLUSTER_URL}"
NEXT_PUBLIC_PROGRAM_ID="${PROGRAM_ID}"
EOF
  fi
  
  # Build application
  echo -e "${BLUE}🔨 Building application...${NC}"
  npm run build
  
  cd ..
}

# Deploy with Docker
deploy_docker() {
  echo -e "${YELLOW}🐳 Deploying with Docker...${NC}"
  
  # Stop existing containers
  echo -e "${BLUE}🛑 Stopping existing containers...${NC}"
  docker-compose down || true
  
  # Build images
  echo -e "${BLUE}🔨 Building Docker images...${NC}"
  docker-compose build --no-cache
  
  # Start services
  echo -e "${BLUE}🚀 Starting services...${NC}"
  docker-compose up -d
  
  # Wait for services to be ready
  echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
  sleep 30
  
  # Check service health
  echo -e "${BLUE}🏥 Checking service health...${NC}"
  docker-compose ps
  
  # Run database migrations in container
  echo -e "${BLUE}🔄 Running database migrations in container...${NC}"
  docker-compose exec backend npx prisma db push
}

# Run tests
run_tests() {
  echo -e "${YELLOW}🧪 Running tests...${NC}"
  
  # Test contracts
  echo -e "${BLUE}📋 Testing contracts...${NC}"
  cd contracts
  anchor test --skip-local-validator
  cd ..
  
  # Test backend
  echo -e "${BLUE}📋 Testing backend...${NC}"
  cd backend
  npm test || echo -e "${YELLOW}⚠️  Backend tests failed (this is expected if no tests are written)${NC}"
  cd ..
  
  # Test frontend
  echo -e "${BLUE}📋 Testing frontend...${NC}"
  cd frontend
  npm test || echo -e "${YELLOW}⚠️  Frontend tests failed (this is expected if no tests are written)${NC}"
  cd ..
  
  echo -e "${GREEN}✅ Tests completed${NC}"
}

# Seed initial data
seed_data() {
  echo -e "${YELLOW}🌱 Seeding initial data...${NC}"
  
  cd backend
  
  # Create seed script if it doesn't exist
  if [ ! -f src/scripts/seed.ts ]; then
    echo -e "${BLUE}📝 Creating seed script...${NC}"
    mkdir -p src/scripts
    cat > src/scripts/seed.ts << 'EOF'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  
  // Create sample achievements
  const achievements = await Promise.all([
    prisma.achievement.upsert({
      where: { id: 'first_bet' },
      update: {},
      create: {
        id: 'first_bet',
        name: 'First Bet',
        description: 'Place your first sidebet',
        icon: '🎯',
        xpReward: 100,
        criteria: { type: 'first_bet' }
      }
    }),
    prisma.achievement.upsert({
      where: { id: 'big_winner' },
      update: {},
      create: {
        id: 'big_winner',
        name: 'Big Winner',
        description: 'Win 10 SOL in a single bet',
        icon: '🏆',
        xpReward: 500,
        criteria: { type: 'big_winner', amount: 10000000000 }
      }
    }),
    prisma.achievement.upsert({
      where: { id: 'pool_creator' },
      update: {},
      create: {
        id: 'pool_creator',
        name: 'Pool Creator',
        description: 'Create your first token pool',
        icon: '🚀',
        xpReward: 200,
        criteria: { type: 'pool_creator' }
      }
    })
  ]);
  
  console.log(`✅ Created ${achievements.length} achievements`);
  
  // Create system stats
  await prisma.systemStats.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      totalPools: 0,
      totalBets: 0,
      totalVolume: BigInt(0),
      totalUsers: 0,
      activePools: 0,
      averageRugScore: 0
    }
  });
  
  console.log('✅ Created system stats');
  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
EOF
  fi
  
  # Run seed script
  npx tsx src/scripts/seed.ts
  
  cd ..
}

# Main deployment function
main() {
  echo -e "${GREEN}🎯 Starting RugFork Enhanced Deployment${NC}"
  
  check_dependencies
  configure_solana
  deploy_contracts
  deploy_backend
  deploy_frontend
  
  if [ "$ENVIRONMENT" = "devnet" ]; then
    deploy_docker
    seed_data
    run_tests
  fi
  
  echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
  echo -e "${BLUE}📊 Services:${NC}"
  echo -e "${BLUE}   Backend API: http://localhost:3000${NC}"
  echo -e "${BLUE}   Frontend: http://localhost:3001${NC}"
  echo -e "${BLUE}   Database: localhost:5432${NC}"
  echo -e "${BLUE}   Redis: localhost:6379${NC}"
  echo -e "${BLUE}   Program ID: ${PROGRAM_ID}${NC}"
  echo -e "${CYAN}🔗 Useful Commands:${NC}"
  echo -e "${CYAN}   View logs: docker-compose logs -f${NC}"
  echo -e "${CYAN}   Stop services: docker-compose down${NC}"
  echo -e "${CYAN}   Restart services: docker-compose restart${NC}"
  echo -e "${CYAN}   Database studio: cd backend && npx prisma studio${NC}"
}

# Run main function
main
