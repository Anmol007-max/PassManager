const fs = require('fs');
const crypto = require('crypto');

if (!fs.existsSync('.env')) {
  const rand = () => crypto.randomBytes(32).toString('base64');
  fs.writeFileSync('.env', [
    'DB_URL=jdbc:postgresql://localhost:7070/passmanager',
    'DB_USER=pm',
    'DB_PASSWORD=pm_dev_password',
    `JWT_SECRET=${rand()}`,
    `PRELOGIN_SECRET=${rand()}`,
    'APP_CORS_ORIGINS=http://localhost:5173',
    ''
  ].join('\n'));
  console.log('Created .env with fresh random secrets');
}
