#!/bin/bash

# RugFork Development Setup Script
# This script sets up the development environment for RugFork

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up RugFork development environment${NC}"

# Check if required tools are installed
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

# Install Rust and Solana tools
install_rust_tools() {
  echo -e "${YELLOW}🦀 Installing Rust tools...${NC}"
  
  # Install Rust if not already installed
  if ! command -v rustc &> /dev/null; then
    echo -e "${BLUE}Installing Rust...${NC}"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source ~/.cargo/env
  fi
  
  # Install Solana CLI
  if ! command -v solana &> /dev/null; then
    echo -e "${BLUE}Installing Solana CLI...${NC}"
    sh -c "$(curl -sSfL https://release.solana.com/v1.18.15/install)"
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
  fi
  
  # Install Anchor CLI
  if ! command -v anchor &> /dev/null; then
    echo -e "${BLUE}Installing Anchor CLI...${NC}"
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
    avm install latest
    avm use latest
  fi
  
  echo -e "${GREEN}✅ Rust tools installed${NC}"
}

# Setup Solana configuration
setup_solana() {
  echo -e "${YELLOW}⚙️  Setting up Solana configuration...${NC}"
  
  # Configure Solana for devnet
  solana config set --url https://api.devnet.solana.com
  
  # Create wallet if it doesn't exist
  if [ ! -f ~/.config/solana/id.json ]; then
    echo -e "${BLUE}🔑 Creating new wallet...${NC}"
    solana-keygen new --no-bip39-passphrase -o ~/.config/solana/id.json
  fi
  
  # Get wallet address
  WALLET_ADDRESS=$(solana address)
  echo -e "${BLUE}💰 Wallet address: ${WALLET_ADDRESS}${NC}"
  
  # Request airdrop
  echo -e "${BLUE}💸 Requesting airdrop...${NC}"
  solana airdrop 2
  
  # Check balance
  BALANCE=$(solana balance)
  echo -e "${GREEN}✅ Wallet balance: ${BALANCE} SOL${NC}"
}

# Install project dependencies
install_dependencies() {
  echo -e "${YELLOW}📦 Installing project dependencies...${NC}"
  
  # Install root dependencies
  echo -e "${BLUE}Installing root dependencies...${NC}"
  npm install
  
  # Install contract dependencies
  echo -e "${BLUE}Installing contract dependencies...${NC}"
  cd contracts
  npm install
  cd ..
  
  # Install backend dependencies
  echo -e "${BLUE}Installing backend dependencies...${NC}"
  cd backend
  npm install
  cd ..
  
  # Install frontend dependencies
  echo -e "${BLUE}Installing frontend dependencies...${NC}"
  cd frontend
  npm install
  cd ..
  
  echo -e "${GREEN}✅ All dependencies installed${NC}"
}

# Setup database
setup_database() {
  echo -e "${YELLOW}🗄️  Setting up database...${NC}"
  
  # Start PostgreSQL with Docker
  echo -e "${BLUE}Starting PostgreSQL...${NC}"
  docker-compose up -d postgres redis
  
  # Wait for database to be ready
  echo -e "${BLUE}Waiting for database to be ready...${NC}"
  sleep 10
  
  # Run database migrations
  echo -e "${BLUE}Running database migrations...${NC}"
  cd backend
  npx prisma generate
  npx prisma db push
  cd ..
  
  echo -e "${GREEN}✅ Database setup complete${NC}"
}

# Build contracts
build_contracts() {
  echo -e "${YELLOW}🔨 Building contracts...${NC}"
  
  cd contracts
  anchor build
  cd ..
  
  echo -e "${GREEN}✅ Contracts built successfully${NC}"
}

# Create environment files
create_env_files() {
  echo -e "${YELLOW}📝 Creating environment files...${NC}"
  
  # Copy example env file
  if [ ! -f .env ]; then
    cp env.example .env
    echo -e "${GREEN}✅ Created .env file from template${NC}"
  fi
  
  # Create backend .env
  if [ ! -f backend/.env ]; then
    cat > backend/.env << EOF
DATABASE_URL="postgresql://rugfork:rugfork123@localhost:5432/rugfork"
REDIS_URL="redis://localhost:6379"
SOLANA_RPC_URL="https://api.devnet.solana.com"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-development"
PORT=3000
NODE_ENV="development"
EOF
    echo -e "${GREEN}✅ Created backend/.env file${NC}"
  fi
  
  # Create frontend .env.local
  if [ ! -f frontend/.env.local ]; then
    cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL="http://localhost:3000"
NEXT_PUBLIC_SOLANA_RPC_URL="https://api.devnet.solana.com"
NEXT_PUBLIC_PROGRAM_ID="RugForkProgram111111111111111111111111111111"
EOF
    echo -e "${GREEN}✅ Created frontend/.env.local file${NC}"
  fi
}

# Run initial tests
run_tests() {
  echo -e "${YELLOW}🧪 Running initial tests...${NC}"
  
  # Test contracts
  echo -e "${BLUE}Testing contracts...${NC}"
  cd contracts
  anchor test --skip-local-validator
  cd ..
  
  echo -e "${GREEN}✅ Tests passed${NC}"
}

# Main setup function
main() {
  echo -e "${GREEN}🎯 Starting RugFork development setup${NC}"
  
  check_dependencies
  install_rust_tools
  setup_solana
  install_dependencies
  create_env_files
  setup_database
  build_contracts
  run_tests
  
  echo -e "${GREEN}🎉 Development environment setup complete!${NC}"
  echo -e "${BLUE}📋 Next steps:${NC}"
  echo -e "${BLUE}   1. Review and update .env files with your API keys${NC}"
  echo -e "${BLUE}   2. Run 'npm run dev' to start development servers${NC}"
  echo -e "${BLUE}   3. Visit http://localhost:3001 to see the frontend${NC}"
  echo -e "${BLUE}   4. Visit http://localhost:3000 to see the backend API${NC}"
  echo -e "${BLUE}   5. Run 'docker-compose up -d' to start all services${NC}"
}

# Run main function
main
