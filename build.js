const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const publicDir = path.join(__dirname, 'public');
const assetsDir = path.join(__dirname, 'assets');

// Очистка и создание папки dist
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);

// Копируем public в dist
fs.cpSync(publicDir, distDir, { recursive: true });

// Копируем assets в dist/assets
fs.mkdirSync(path.join(distDir, 'assets'));
fs.cpSync(assetsDir, path.join(distDir, 'assets'), { recursive: true });

console.log('✅ Сборка готова в папке /dist!');
console.log('Помни: для работы базы данных нужен активный Node.js сервер, а не просто статика.');