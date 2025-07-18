# Deploy Colyseus Game Server on AWS EC2

## Prerequisites
- AWS CLI configured (`aws configure`)
- EC2 key pair created
- Security group for WebSocket traffic

## 1. Create Security Group for Colyseus

```bash
# Create security group
aws ec2 create-security-group \
  --group-name colyseus-game-server \
  --description "Security group for Colyseus WebSocket server"

# Allow SSH access (port 22)
aws ec2 authorize-security-group-ingress \
  --group-name colyseus-game-server \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

# Allow WebSocket traffic (port 2567)
aws ec2 authorize-security-group-ingress \
  --group-name colyseus-game-server \
  --protocol tcp \
  --port 2567 \
  --cidr 0.0.0.0/0

# Allow HTTP for health checks (port 80)
aws ec2 authorize-security-group-ingress \
  --group-name colyseus-game-server \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0
```

## 2. Launch EC2 Instance

```bash
# Launch t3.small instance with Ubuntu 22.04
aws ec2 run-instances \
  --image-id ami-0e2c8caa4b6378d8c \
  --instance-type t3.small \
  --key-name your-key-pair \
  --security-groups colyseus-game-server \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=defivalley-colyseus}]' \
  --user-data file://user-data.sh
```

## 3. User Data Script (user-data.sh)

Create this file before running the EC2 launch command:

```bash
#!/bin/bash
# Update system
apt-get update
apt-get upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install git
apt-get install -y git

# Create app directory
mkdir -p /home/ubuntu/defivalley-server
cd /home/ubuntu/defivalley-server

# Clone your repository
git clone https://github.com/LukeFost/defivalley.git .

# Navigate to server directory
cd apps/server

# Install dependencies
npm install

# Build the server
npm run build

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'colyseus-server',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 2567
    },
    error_file: '/home/ubuntu/logs/error.log',
    out_file: '/home/ubuntu/logs/out.log',
    log_file: '/home/ubuntu/logs/combined.log',
    time: true
  }]
};
EOF

# Create logs directory
mkdir -p /home/ubuntu/logs

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Install and configure Nginx as reverse proxy
apt-get install -y nginx

# Configure Nginx for WebSocket support
cat > /etc/nginx/sites-available/colyseus << 'EOF'
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
EOF

# Enable the site
ln -s /etc/nginx/sites-available/colyseus /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Restart Nginx
systemctl restart nginx

# Set up automatic security updates
apt-get install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

## 4. Get Instance IP Address

```bash
# Get the public IP of your instance
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=defivalley-colyseus" \
  --query "Reservations[0].Instances[0].PublicIpAddress" \
  --output text
```

## 5. Update Colyseus Server CORS Settings

SSH into your instance and update the CORS configuration:

```bash
# SSH into instance
ssh -i your-key.pem ubuntu@YOUR_INSTANCE_IP

# Edit the server configuration
cd /home/ubuntu/defivalley-server/apps/server
nano src/index.ts
```

Add/update CORS configuration:

```typescript
import cors from 'cors';

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://defivalley.vercel.app',
    /\.vercel\.app$/,  // Allow all Vercel preview deployments
    // Add your production domain here
  ],
  credentials: true
}));
```

Then rebuild and restart:

```bash
npm run build
pm2 restart colyseus-server
```

## 6. Configure DNS (Optional - Using Route 53)

```bash
# Create hosted zone if needed
aws route53 create-hosted-zone \
  --name game.defivalley.com \
  --caller-reference $(date +%s)

# Create A record pointing to EC2 instance
aws route53 change-resource-record-sets \
  --hosted-zone-id YOUR_HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "game.defivalley.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "YOUR_INSTANCE_IP"}]
      }
    }]
  }'
```

## 7. Set Environment Variable in Vercel

```bash
# For WebSocket connection (no SSL)
NEXT_PUBLIC_GAME_SERVER_URL=ws://YOUR_INSTANCE_IP

# Or if using domain
NEXT_PUBLIC_GAME_SERVER_URL=ws://game.defivalley.com
```

## 8. SSL Setup (Production - Using Let's Encrypt)

```bash
# SSH into instance
ssh -i your-key.pem ubuntu@YOUR_INSTANCE_IP

# Install Certbot
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Get certificate
sudo certbot --nginx -d game.defivalley.com

# Update Vercel to use WSS
# NEXT_PUBLIC_GAME_SERVER_URL=wss://game.defivalley.com
```

## 9. Monitoring & Management

```bash
# Check server status
pm2 status

# View logs
pm2 logs colyseus-server

# Monitor resources
pm2 monit

# Restart server
pm2 restart colyseus-server

# Scale to multiple instances
pm2 scale colyseus-server 2
```

## 10. Auto-scaling Setup (Optional)

```bash
# Create AMI from configured instance
aws ec2 create-image \
  --instance-id YOUR_INSTANCE_ID \
  --name "defivalley-colyseus-ami" \
  --description "Colyseus game server AMI"

# Create launch template
aws ec2 create-launch-template \
  --launch-template-name colyseus-template \
  --launch-template-data '{
    "ImageId": "YOUR_AMI_ID",
    "InstanceType": "t3.small",
    "SecurityGroupIds": ["YOUR_SECURITY_GROUP_ID"],
    "KeyName": "your-key-pair"
  }'

# Create target group
aws elbv2 create-target-group \
  --name colyseus-targets \
  --protocol TCP \
  --port 2567 \
  --vpc-id YOUR_VPC_ID \
  --target-type instance

# Create Network Load Balancer
aws elbv2 create-load-balancer \
  --name colyseus-nlb \
  --type network \
  --subnets YOUR_SUBNET_IDS
```

## Cost Optimization Tips

1. **Use Spot Instances** for development:
   ```bash
   --instance-market-options 'MarketType=spot'
   ```

2. **Use Reserved Instances** for production (save up to 72%)

3. **Enable CloudWatch monitoring**:
   ```bash
   aws ec2 monitor-instances --instance-ids YOUR_INSTANCE_ID
   ```

4. **Set up billing alerts**:
   ```bash
   aws cloudwatch put-metric-alarm \
     --alarm-name colyseus-billing \
     --alarm-description "Alert when EC2 costs exceed $50" \
     --metric-name EstimatedCharges \
     --namespace AWS/Billing \
     --statistic Maximum \
     --period 86400 \
     --threshold 50 \
     --comparison-operator GreaterThanThreshold
   ```

## Troubleshooting

### Check if Colyseus is running:
```bash
curl http://YOUR_INSTANCE_IP/health
```

### Test WebSocket connection:
```bash
npm install -g wscat
wscat -c ws://YOUR_INSTANCE_IP:2567
```

### View server logs:
```bash
pm2 logs colyseus-server --lines 100
```

### Check Nginx status:
```bash
sudo systemctl status nginx
sudo nginx -t  # Test configuration
```

## Security Best Practices

1. **Restrict SSH access** to your IP:
   ```bash
   aws ec2 modify-security-group-rules \
     --group-id YOUR_SG_ID \
     --security-group-rules '[{
       "SecurityGroupRuleId": "YOUR_RULE_ID",
       "SecurityGroupRule": {
         "IpProtocol": "tcp",
         "FromPort": 22,
         "ToPort": 22,
         "CidrIpv4": "YOUR_IP/32"
       }
     }]'
   ```

2. **Enable AWS Systems Manager** for secure access without SSH keys

3. **Set up CloudWatch Logs** for centralized logging

4. **Enable AWS WAF** if using Application Load Balancer

5. **Regular security updates** via unattended-upgrades

## Estimated Costs (US East 1)

- **t3.small**: ~$15/month (on-demand)
- **t3.small**: ~$9/month (1-year reserved)
- **Data transfer**: First 100GB free, then $0.09/GB
- **EBS storage**: 8GB free tier, then $0.10/GB/month

Total: ~$15-25/month for basic setup