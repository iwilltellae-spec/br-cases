const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Настройка Express
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public'))); // Если запускаем локально
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// --- БАЗА ДАННЫХ (SQLite) ---
const dbFile = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbFile);

db.serialize(() => {
    // Таблица пользователей
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id INTEGER UNIQUE,
        username TEXT,
        balance INTEGER DEFAULT 5000,
        inventory TEXT DEFAULT '[]'
    )`);
});

// --- КОНФИГ КЕЙСОВ И ПРЕДМЕТОВ ---
const ITEMS = [
    { id: 1, name: 'Lada Priora', type: 'car', price: 500, img: 'item_car.png', rarity: 'common' },
    { id: 2, name: 'BMW M5 F90', type: 'car', price: 5000, img: 'item_car.png', rarity: 'legendary' },
    { id: 3, name: '1000 Рублей', type: 'money', price: 1000, img: 'item_money.png', rarity: 'common' },
    { id: 4, name: '50000 Рублей', type: 'money', price: 50000, img: 'item_money.png', rarity: 'rare' },
];

const CASES = {
    'novice': { name: 'Кейс Новичка', price: 1000, items: [1, 3] },
    'rich': { name: 'Особый Кейс', price: 5000, items: [1, 2, 3, 4] }
};

// --- API МЕТОДЫ ---

// 1. ВХОД / РЕГИСТРАЦИЯ
app.post('/api/auth', (req, res) => {
    const { telegram_id, username } = req.body;
    
    if (!telegram_id) return res.status(400).json({ error: 'Нет ID' });

    db.get("SELECT * FROM users WHERE telegram_id = ?", [telegram_id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Ошибка БД' });

        if (row) {
            // Пользователь найден
            res.json(row);
        } else {
            // Новый пользователь
            db.run("INSERT INTO users (telegram_id, username) VALUES (?, ?)", 
                [telegram_id, username || 'Anon'], 
                function(err) {
                    if (err) return res.status(500).json({ error: 'Ошибка регистрации' });
                    // Возвращаем нового юзера
                    res.json({ id: this.lastID, telegram_id, username, balance: 5000, inventory: '[]' });
                }
            );
        }
    });
});

// 2. ОТКРЫТИЕ КЕЙСА
app.post('/api/open', (req, res) => {
    const { telegram_id, caseType } = req.body;
    const currentCase = CASES[caseType];

    if (!currentCase) return res.status(400).json({ error: 'Кейс не найден' });

    db.get("SELECT * FROM users WHERE telegram_id = ?", [telegram_id], (err, user) => {
        if (!user) return res.status(404).json({ error: 'Юзер не найден' });
        if (user.balance < currentCase.price) return res.status(400).json({ error: 'Недостаточно средств' });

        // Логика рандома (простая)
        const possibleItems = ITEMS.filter(i => currentCase.items.includes(i.id));
        const wonItem = possibleItems[Math.floor(Math.random() * possibleItems.length)];

        // Обновляем БД
        const newBalance = user.balance - currentCase.price;
        const inventory = JSON.parse(user.inventory);
        inventory.push(wonItem); // Добавляем предмет

        db.run("UPDATE users SET balance = ?, inventory = ? WHERE telegram_id = ?", 
            [newBalance, JSON.stringify(inventory), telegram_id], 
            (err) => {
                if (err) return res.status(500).json({ error: 'Ошибка сохранения' });
                res.json({ wonItem, newBalance });
            }
        );
    });
});

// 3. РАСПЫЛЕНИЕ (ПРОДАЖА)
app.post('/api/sell', (req, res) => {
    const { telegram_id, itemIndex } = req.body; // itemIndex - позиция в инвентаре

    db.get("SELECT * FROM users WHERE telegram_id = ?", [telegram_id], (err, user) => {
        let inventory = JSON.parse(user.inventory);
        if (!inventory[itemIndex]) return res.status(400).json({ error: 'Предмет не найден' });

        const item = inventory[itemIndex];
        const sellPrice = Math.floor(item.price * 0.8); // 80% от стоимости

        inventory.splice(itemIndex, 1); // Удаляем
        const newBalance = user.balance + sellPrice;

        db.run("UPDATE users SET balance = ?, inventory = ? WHERE telegram_id = ?",
            [newBalance, JSON.stringify(inventory), telegram_id],
            (err) => {
                res.json({ newBalance, soldPrice: sellPrice });
            }
        );
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});