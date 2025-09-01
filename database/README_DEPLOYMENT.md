# ActivityPro - Deployment Guide

## 📋 Instruções para Implementação na Empresa

### 🎯 Pré-requisitos

1. **Servidor PostgreSQL** (versão 12 ou superior)
2. **Node.js** (versão 18 ou superior)
3. **Git** para versionamento
4. **Domínio** ou servidor web configurado

### 🚀 Passos para Deployment

#### 1. **Preparação do Banco de Dados**

```bash
# 1. Conecte ao PostgreSQL como superusuário
psql -U postgres

# 2. Crie o banco de dados
CREATE DATABASE activitypro;

# 3. Crie um usuário específico
CREATE USER activitypro_user WITH PASSWORD 'sua_senha_segura';

# 4. Conceda permissões
GRANT ALL PRIVILEGES ON DATABASE activitypro TO activitypro_user;

# 5. Conecte ao banco criado
\c activitypro

# 6. Execute a migração
\i migration.sql
```

#### 2. **Configuração da Aplicação**

```bash
# 1. Clone o repositório
git clone [URL_DO_REPOSITORIO]
cd activitypro

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env
```

#### 3. **Variáveis de Ambiente (.env)**

```env
# Database
DATABASE_URL=postgresql://activitypro_user:sua_senha_segura@localhost:5432/activitypro
PGHOST=localhost
PGPORT=5432
PGUSER=activitypro_user
PGPASSWORD=sua_senha_segura
PGDATABASE=activitypro

# Session
SESSION_SECRET=gere_uma_chave_secreta_forte_aqui

# Application
NODE_ENV=production
PORT=5000
```

#### 4. **Build e Deploy**

```bash
# 1. Build da aplicação
npm run build

# 2. Inicie em produção
npm start

# Ou use PM2 para gerenciamento de processo
npm install -g pm2
pm2 start npm --name "activitypro" -- start
pm2 save
pm2 startup
```

### 🔐 Credenciais Padrão

Após a migração, estarão disponíveis:

- **Administrador**: `admin` / `admin123`
- **Demo**: `demo` / `demo123`

> ⚠️ **IMPORTANTE**: Altere essas senhas imediatamente após o primeiro login!

### 🌐 Configuração do Servidor Web

#### Nginx (Recomendado)

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 🔧 Configurações Adicionais

#### SSL/HTTPS com Certbot

```bash
# Instale certbot
sudo apt install certbot python3-certbot-nginx

# Obtenha certificado SSL
sudo certbot --nginx -d seu-dominio.com

# Teste renovação automática
sudo certbot renew --dry-run
```

#### Backup do Banco de Dados

```bash
# Script de backup diário
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U activitypro_user -h localhost activitypro > backup_activitypro_$DATE.sql
```

### 📊 Monitoramento

#### Logs da Aplicação

```bash
# Ver logs em tempo real
pm2 logs activitypro

# Ver status dos processos
pm2 status
```

#### Monitoramento do Banco

```sql
-- Verificar conexões ativas
SELECT count(*) FROM pg_stat_activity WHERE datname = 'activitypro';

-- Verificar tamanho do banco
SELECT pg_size_pretty(pg_database_size('activitypro'));
```

### 🛠️ Manutenção

#### Backup Automático

Adicione ao crontab (`crontab -e`):

```bash
# Backup diário às 2h da manhã
0 2 * * * /path/to/backup_script.sh
```

#### Atualizações do Sistema

```bash
# 1. Pare a aplicação
pm2 stop activitypro

# 2. Faça backup do banco
pg_dump -U activitypro_user activitypro > backup_antes_atualizacao.sql

# 3. Atualize o código
git pull origin main
npm install
npm run build

# 4. Execute migrações se necessário
npm run db:push

# 5. Reinicie a aplicação
pm2 restart activitypro
```

### 🆘 Solução de Problemas

#### Erro de Conexão com Banco

```bash
# Verifique se o PostgreSQL está rodando
sudo systemctl status postgresql

# Teste conexão manual
psql -U activitypro_user -h localhost -d activitypro
```

#### Erro de Permissões

```bash
# Verifique logs
pm2 logs activitypro

# Verifique permissões do usuário do banco
psql -U postgres -c "\du"
```

#### Reset de Senha de Usuário

```sql
-- Conecte ao banco e execute:
UPDATE users SET password = '$2b$10$NzHsXwuWdzV0u5L6gxEBw.Bbqj.8ulLxSEN/cV/pEXvwl1tDWrfmy' 
WHERE username = 'admin';
-- Isso redefine a senha para 'admin123'
```

### 📞 Suporte

Para suporte técnico ou dúvidas sobre a implementação, consulte a documentação do sistema ou contate a equipe de desenvolvimento.

---

**ActivityPro v1.0.0** - Sistema de Controle de Atividades e Tempo