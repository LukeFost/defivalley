#!/bin/bash

# DeFi Valley Colyseus EC2 Deployment Script
# Usage: ./deploy-colyseus-ec2.sh [key-pair-name] [region]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
KEY_PAIR=${1:-"defivalley-key"}
REGION=${2:-"us-east-1"}
INSTANCE_TYPE="t3.small"
AMI_ID="ami-0e2c8caa4b6378d8c"  # Ubuntu 22.04 LTS in us-east-1
SECURITY_GROUP_NAME="colyseus-game-server"
INSTANCE_NAME="defivalley-colyseus"

echo -e "${GREEN}🚀 DeFi Valley Colyseus EC2 Deployment${NC}"
echo -e "Region: ${YELLOW}$REGION${NC}"
echo -e "Key Pair: ${YELLOW}$KEY_PAIR${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if key pair exists
echo -e "\n${YELLOW}Checking key pair...${NC}"
if ! aws ec2 describe-key-pairs --key-names "$KEY_PAIR" --region "$REGION" &> /dev/null; then
    echo -e "${RED}❌ Key pair '$KEY_PAIR' not found. Creating one...${NC}"
    aws ec2 create-key-pair --key-name "$KEY_PAIR" --query 'KeyMaterial' --output text > "${KEY_PAIR}.pem"
    chmod 400 "${KEY_PAIR}.pem"
    echo -e "${GREEN}✅ Key pair created and saved to ${KEY_PAIR}.pem${NC}"
fi

# Create security group
echo -e "\n${YELLOW}Setting up security group...${NC}"
SG_ID=$(aws ec2 describe-security-groups --group-names "$SECURITY_GROUP_NAME" --region "$REGION" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "")

if [ -z "$SG_ID" ] || [ "$SG_ID" == "None" ]; then
    echo "Creating security group..."
    SG_ID=$(aws ec2 create-security-group \
        --group-name "$SECURITY_GROUP_NAME" \
        --description "Security group for Colyseus WebSocket server" \
        --region "$REGION" \
        --output text)
    
    # Add security group rules
    aws ec2 authorize-security-group-ingress \
        --group-id "$SG_ID" \
        --protocol tcp \
        --port 22 \
        --cidr 0.0.0.0/0 \
        --region "$REGION"
    
    aws ec2 authorize-security-group-ingress \
        --group-id "$SG_ID" \
        --protocol tcp \
        --port 2567 \
        --cidr 0.0.0.0/0 \
        --region "$REGION"
    
    aws ec2 authorize-security-group-ingress \
        --group-id "$SG_ID" \
        --protocol tcp \
        --port 80 \
        --cidr 0.0.0.0/0 \
        --region "$REGION"
    
    echo -e "${GREEN}✅ Security group created: $SG_ID${NC}"
else
    echo -e "${GREEN}✅ Security group already exists: $SG_ID${NC}"
fi

# Create user data script
echo -e "\n${YELLOW}Creating user data script...${NC}"
cat > user-data.sh << 'EOF'
#!/bin/bash
apt-get update
apt-get upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install git and nginx
apt-get install -y git nginx

# Create app directory
mkdir -p /home/ubuntu/defivalley-server
cd /home/ubuntu/defivalley-server

# Clone repository
git clone https://github.com/LukeFost/defivalley.git .

# Navigate to server directory
cd apps/server

# Install dependencies
npm install

# Build the server
npm run build

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOFPM2'
module.exports = {
  apps: [{
    name: 'colyseus-server',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 2567
    }
  }]
};
EOFPM2

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Configure Nginx for WebSocket support
cat > /etc/nginx/sites-available/colyseus << 'EOFNGINX'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:2567;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
EOFNGINX

# Enable the site
ln -s /etc/nginx/sites-available/colyseus /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Restart Nginx
systemctl restart nginx

# Set up automatic security updates
apt-get install -y unattended-upgrades
echo 'Unattended-Upgrade::Automatic-Reboot "false";' >> /etc/apt/apt.conf.d/50unattended-upgrades
EOF

# Launch EC2 instance
echo -e "\n${YELLOW}Launching EC2 instance...${NC}"
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$AMI_ID" \
    --instance-type "$INSTANCE_TYPE" \
    --key-name "$KEY_PAIR" \
    --security-group-ids "$SG_ID" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
    --user-data file://user-data.sh \
    --region "$REGION" \
    --output text \
    --query 'Instances[0].InstanceId')

echo -e "${GREEN}✅ Instance launched: $INSTANCE_ID${NC}"

# Wait for instance to be running
echo -e "\n${YELLOW}Waiting for instance to start...${NC}"
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo -e "${GREEN}✅ Instance is running!${NC}"
echo -e "\n${GREEN}🎮 Colyseus Server Details:${NC}"
echo -e "Instance ID: ${YELLOW}$INSTANCE_ID${NC}"
echo -e "Public IP: ${YELLOW}$PUBLIC_IP${NC}"
echo -e "WebSocket URL: ${YELLOW}ws://$PUBLIC_IP${NC}"
echo -e "SSH Command: ${YELLOW}ssh -i ${KEY_PAIR}.pem ubuntu@$PUBLIC_IP${NC}"

# Create .env.production file
echo -e "\n${YELLOW}Creating .env.production file...${NC}"
cat > ../apps/web/.env.production << EOF
# Game Server URL
NEXT_PUBLIC_GAME_SERVER_URL=ws://$PUBLIC_IP

# Existing Web3 variables
NEXT_PUBLIC_PRIVY_APP_ID=cmcph1jpi002hjw0nk76yfxu8
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=bdd94739681190d1274efc1059cbf744
EOF

echo -e "${GREEN}✅ Created .env.production with server URL${NC}"

# Clean up
rm -f user-data.sh

echo -e "\n${GREEN}🎉 Deployment complete!${NC}"
echo -e "\n${YELLOW}⏱️  Note: The server will take 3-5 minutes to fully initialize.${NC}"
echo -e "${YELLOW}You can check the status with:${NC}"
echo -e "  curl http://$PUBLIC_IP/health"
echo -e "\n${YELLOW}To monitor the server:${NC}"
echo -e "  ssh -i ${KEY_PAIR}.pem ubuntu@$PUBLIC_IP"
echo -e "  pm2 logs colyseus-server"

# Output for GitHub Actions or CI/CD
echo "::set-output name=instance-id::$INSTANCE_ID"
echo "::set-output name=public-ip::$PUBLIC_IP"
echo "::set-output name=websocket-url::ws://$PUBLIC_IP"