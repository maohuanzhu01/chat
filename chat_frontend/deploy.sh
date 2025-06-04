#!/bin/bash

# Costanti
SERVER="dev-oma@192.168.46.47"
DEST_PATH="/var/www/html/chat/chat_frontend/"

# Sincronizzazione file necessari alla build
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.env.local' \
  . $SERVER:$DEST_PATH

# Connessione al server e build+start
ssh $SERVER << 'EOF'
npx pm2 stop chat-ai
npx pm2 delete chat-ai
cd /var/www/html/chat/chat_frontend
rm -R .next
npm install --omit=dev
npm run build
npx pm2 start npm --name "chat-ai" -- start -- -p 3030
npx pm2 save
EOF