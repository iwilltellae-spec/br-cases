const tg = window.Telegram?.WebApp || { // на всякий случай, чтобы не падало в браузере
    expand: () => {},
    initDataUnsafe: null,
    HapticFeedback: { impactOccurred(){}, notificationOccurred(){}, selectionChanged(){} },
    showAlert: (msg) => alert(msg)
};

tg.expand();

let user = null;
let isSpinning = false;
const API_URL = ''; // на Render можно оставить пустым

// ================= ИНИЦИАЛИЗАЦИЯ =================

window.onload = async () => {
    // Берём данные пользователя из Telegram, а в браузере — тестовые
    const tgUser = tg.initDataUnsafe?.user || { id: 111111, username: 'BrowserTest' };

    try {
        const response = await fetch(`${API_URL}/api/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegram_id: tgUser.id,
                username: tgUser.username
            })
        });

        const rawUser = await response.json();

        user = {
            ...rawUser,
            inventory: JSON.parse(rawUser.inventory || '[]')
        };

        updateUI();
        renderInventory();
    } catch (e) {
        console.error('Ошибка соединения с сервером', e);
        tg.showAlert('Нет связи с сервером. Попробуй позже.');
    }
};

// Кнопка "НАЧАТЬ ОТКРЫВАТЬ"
function startGame() {
    if (!user) {
        tg.showAlert('Идёт подключение к серверу, подожди секунду...');
        return;
    }

    const welcome = document.getElementById('welcome-screen');
    welcome.style.transition = 'opacity 0.4s';
    welcome.style.opacity = '0';

    setTimeout(() => {
        welcome.style.display = 'none';
        document.getElementById('app').classList.remove('hidden');
    }, 400);
}

// Обновление баланса и т.п.
function updateUI() {
    if (!user) return;
    const balanceEl = document.getElementById('balance');
    if (balanceEl) {
        balanceEl.innerText = Number(user.balance || 0).toLocaleString('ru-RU');
    }
}

// Переключение вкладок (Главная / Инвентарь)
function switchTab(tab) {
    const mainScreen = document.getElementById('main-screen');
    const invScreen = document.getElementById('inventory-screen');
    const tabMain = document.getElementById('tab-main');
    const tabInv = document.getElementById('tab-inventory');

    if (tab === 'main') {
        mainScreen.classList.remove('hidden');
        invScreen.classList.add('hidden');
        tabMain.classList.add('active');
        tabInv.classList.remove('active');
    } else {
        mainScreen.classList.add('hidden');
        invScreen.classList.remove('hidden');
        tabMain.classList.remove('active');
        tabInv.classList.add('active');
        renderInventory();
    }
}

// ================= ОТКРЫТИЕ КЕЙСА =================

async function openCaseMenu(caseKey) {
    if (isSpinning || !user) return;

    tg.HapticFeedback.impactOccurred('medium');

    try {
        const response = await fetch(`${API_URL}/api/open`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegram_id: user.telegram_id, caseType: caseKey })
        });

        const data = await response.json();
        if (data.error) {
            tg.showAlert(data.error);
            return;
        }

        // Обновляем баланс
        user.balance = data.newBalance;
        updateUI();

        // Запускаем рулетку с выигранным предметом
        startRoulette(data.wonItem);
    } catch (e) {
        console.error(e);
        tg.showAlert('Ошибка при открытии кейса');
    }
}

// ================= РУЛЕТКА =================

function startRoulette(wonItem) {
    isSpinning = true;

    // Добавляем предмет в локальный инвентарь (на сервере он уже добавлен)
    if (user && Array.isArray(user.inventory)) {
        user.inventory.push(wonItem);
    } else {
        user.inventory = [wonItem];
    }

    const openScreen = document.getElementById('open-screen');
    openScreen.classList.remove('hidden');
    document.getElementById('win-message').classList.add('hidden');

    const track = document.getElementById('roulette-track');
    track.innerHTML = '';
    track.style.transition = 'none';
    track.style.transform = 'translateX(0)';

    const randomImgs = ['item_car.png', 'item_money.png'];
    let itemsHtml = '';

    // Фейковые предметы до выигрыша
    for (let i = 0; i < 45; i++) {
        const rnd = randomImgs[Math.floor(Math.random() * randomImgs.length)];
        itemsHtml += `<div class="roulette-item"><img src="assets/${rnd}"></div>`;
    }

    // Карточка выигрыша
    itemsHtml += `<div class="roulette-item" id="winner-card"><img src="assets/${wonItem.img}"></div>`;

    // Немного мусора после
    for (let i = 0; i < 5; i++) {
        const rnd = randomImgs[Math.floor(Math.random() * randomImgs.length)];
        itemsHtml += `<div class="roulette-item"><img src="assets/${rnd}"></div>`;
    }

    track.innerHTML = itemsHtml;

    // Запуск движения
    setTimeout(() => {
        const itemWidth = 100; // 90 + марджины
        const offset = (35 * itemWidth) - (window.innerWidth / 2) + (itemWidth / 2);

        track.style.transition = 'transform 5s cubic-bezier(0.15, 0.9, 0.3, 1)';
        track.style.transform = `translateX(-${offset}px)`;
    }, 50);

    setTimeout(() => {
        isSpinning = false;
        showWinScreen(wonItem);
        renderInventory();
        tg.HapticFeedback.notificationOccurred('success');
    }, 5500);
}

function showWinScreen(item) {
    document.getElementById('win-message').classList.remove('hidden');
    document.getElementById('win-name').innerText = item.name;
    document.getElementById('win-img').src = `assets/${item.img}`;
}

function closeOpenScreen() {
    document.getElementById('open-screen').classList.add('hidden');
}

// ================= ИНВЕНТАРЬ =================

function rarityLabel(r) {
    if (r === 'legendary') return 'Легендарный';
    if (r === 'rare') return 'Редкий';
    return 'Обычный';
}

function renderInventory() {
    const list = document.getElementById('inventory-list');
    if (!list || !user) return;

    const inv = user.inventory || [];

    if (!inv.length) {
        list.innerHTML = '<div class="inventory-empty">Инвентарь пуст. Открой пару кейсов!</div>';
        return;
    }

    list.innerHTML = inv
        .map((item, index) => `
            <div class="inventory-item">
                <div class="inv-main">
                    <img src="assets/${item.img}" alt="${item.name}">
                    <div class="inv-text">
                        <div class="inv-name">${item.name}</div>
                        <div class="inv-meta">
                            <span class="rarity ${item.rarity}">${rarityLabel(item.rarity)}</span>
                            <span class="inv-price">${item.price} BC</span>
                        </div>
                    </div>
                </div>
                <button class="inv-sell-btn" onclick="sellFromInventory(${index})">
                    РАСПЫЛИТЬ
                </button>
            </div>
        `)
        .join('');
}

// Продажа предмета из инвентаря по индексу
async function sellFromInventory(index) {
    if (!user || !user.inventory || !user.inventory[index]) return;

    const item = user.inventory[index];

    try {
        const response = await fetch(`${API_URL}/api/sell`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegram_id: user.telegram_id,
                itemIndex: index
            })
        });

        const data = await response.json();
        if (data.error) {
            tg.showAlert(data.error);
            return;
        }

        user.balance = data.newBalance;
        // Удаляем локально
        user.inventory.splice(index, 1);

        updateUI();
        renderInventory();

        tg.HapticFeedback.notificationOccurred('success');
        tg.showAlert(`Ты распылил "${item.name}" и получил ${data.soldPrice} BC`);
    } catch (e) {
        console.error(e);
        tg.showAlert('Ошибка при распылении');
    }
}

// Распыление последнего предмета (сразу после выигрыша)
function sellLastItem() {
    if (!user || !user.inventory || !user.inventory.length) {
        closeOpenScreen();
        return;
    }

    const lastIndex = user.inventory.length - 1;
    sellFromInventory(lastIndex);
    closeOpenScreen();
}