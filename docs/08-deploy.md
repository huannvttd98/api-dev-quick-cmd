# Deploy Guide (API Dev Quick CMD)

Tai lieu nay huong dan deploy API len server Linux (Ubuntu) theo mo hinh:

- Node.js app chay bang PM2
- Nginx reverse proxy
- HTTPS bang Let's Encrypt

## 1. Tong quan

API source nam tai thu muc `api/`.

Port mac dinh trong app:

- `8787` (co the doi qua bien moi truong `PORT`)

Domain vi du trong tai lieu:

- `api.example.com`

## 2. Chuan bi server

Cap nhat package:

```bash
sudo apt update && sudo apt upgrade -y
```

Cai cac goi can thiet:

```bash
sudo apt install -y git curl nginx mariadb-server
```

Cai Node.js LTS (khuyen nghi 20):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

Khoi tao MariaDB:

```bash
sudo systemctl enable mariadb
sudo systemctl start mariadb
sudo mysql_secure_installation
```

Tao database + schema:

```bash
sudo mysql -u root -p < /var/www/api-dev-quick-cmd/api/db/mariadb.schema.sql
```

## 3. Lay source code

```bash
cd /var/www
sudo mkdir -p api-dev-quick-cmd
sudo chown -R $USER:$USER /var/www/api-dev-quick-cmd
cd /var/www/api-dev-quick-cmd

git clone <YOUR_REPO_URL> .
```

## 4. Build va chay API

Di chuyen vao root project:

```bash
cd /var/www/api-dev-quick-cmd
```

Cai dependencies cho API:

```bash
npm --prefix api install
```

Build production:

```bash
npm --prefix api run build
```

Test chay local process:

```bash
PORT=8787 DATASET_VERSION=2026-04-24 npm --prefix api run start
```

Neu thay log `CLI API listening on http://localhost:8787` la OK.

## 5. Chay background voi PM2

Cai PM2 global:

```bash
sudo npm install -g pm2
```

Start app:

```bash
cd /var/www/api-dev-quick-cmd/api
DATABASE_DRIVER=mariadb DB_HOST=127.0.0.1 DB_PORT=3306 DB_NAME=api_dev_quick_cmd DB_USER=root DB_PASSWORD='<PASSWORD>' PORT=8787 DATASET_VERSION=2026-04-24 pm2 start dist/server.js --name api-dev-quick-cmd

# Neu frontend dung origin rieng, bo sung CORS_ORIGINS:
# CORS_ORIGINS="http://localhost:5173,https://app.example.com" DATABASE_DRIVER=mariadb DB_HOST=127.0.0.1 DB_PORT=3306 DB_NAME=api_dev_quick_cmd DB_USER=root DB_PASSWORD='<PASSWORD>' PORT=8787 DATASET_VERSION=2026-04-24 pm2 start dist/server.js --name api-dev-quick-cmd
```

Kiem tra:

```bash
pm2 status
pm2 logs api-dev-quick-cmd --lines 100
curl http://127.0.0.1:8787/health
```

Bat tu khoi dong cung he thong:

```bash
pm2 startup
pm2 save
```

Cap nhat bien moi truong khi da start truoc do:

```bash
pm2 restart api-dev-quick-cmd --update-env
```

## 6. Cau hinh Nginx reverse proxy

Tao file config:

```bash
sudo nano /etc/nginx/sites-available/api-dev-quick-cmd
```

Noi dung:

```nginx
server {
    listen 8787;
    listen [::]:8787;

    server_name _;

    client_max_body_size 50M;

    access_log /var/log/nginx/productmap_access.log;
    error_log /var/log/nginx/productmap_error.log;

    location / {
        proxy_pass http://127.0.0.1:8000;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 90s;
        proxy_connect_timeout 90s;
    }

    # Bảo mật: Chặn truy cập các file ẩn (.git, .env)
    location ~ /\.(?!well-known) {
        deny all;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/api-dev-quick-cmd /etc/nginx/sites-enabled/
```

Test va reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Test API qua domain:

```bash
curl http://api.example.com/health
```

## 7. Cai SSL voi Let's Encrypt

Cai certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Cap cert:

```bash
sudo certbot --nginx -d api.example.com
```

Kiem tra auto renew:

```bash
sudo certbot renew --dry-run
```

## 8. Mo firewall (neu dung UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

## 9. Quy trinh deploy ban cap nhat

Moi lan cap nhat code:

```bash
cd /var/www/api-dev-quick-cmd
git pull
npm --prefix api install
npm --prefix api run build
pm2 restart api-dev-quick-cmd
pm2 logs api-dev-quick-cmd --lines 50
```

## 10. Health checks sau deploy

Kiem tra local process:

```bash
curl http://127.0.0.1:8787/health
```

Kiem tra public domain:

```bash
curl https://api.example.com/health
```

Kiem tra endpoint chinh:

```bash
curl "https://api.example.com/api/v1/version"
curl "https://api.example.com/api/v1/categories"
curl "https://api.example.com/api/v1/search?q=pull&limit=5"

Kiem tra CORS header (vi du cho frontend dev):

```bash
curl -i -H "Origin: http://localhost:5173" "https://api.example.com/api/v1/categories"
```

Response can co header `Access-Control-Allow-Origin`.
```

## 11. Troubleshooting nhanh

Loi 502 Bad Gateway:

- PM2 process chua chay hoac sai port
- Kiem tra: `pm2 status`, `pm2 logs api-dev-quick-cmd`

Nginx config loi:

- Kiem tra: `sudo nginx -t`
- Reload lai: `sudo systemctl reload nginx`

Cert SSL loi:

- Domain chua tro dung IP server
- Port 80/443 bi chan firewall

## 12. Checklist production

- [ ] Domain DNS da tro ve server
- [ ] PM2 da `save` va `startup`
- [ ] Nginx da enable site, `nginx -t` pass
- [ ] HTTPS hoat dong
- [ ] Endpoint `/health` va `/api/v1/version` tra dung
- [ ] Co quy trinh backup va log monitoring
