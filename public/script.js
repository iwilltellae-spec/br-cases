const tg = window.Telegram.WebApp;
tg.expand(); // На весь экран

// Переменные состояния
let user = null;
let currentCaseId = null;
let isSpinning = false;

// API URL (Если локально - пустая строка, если на сервере - адрес сервера)
// Поскольку у нас сервер раздает статику, можно оставить пустым
const API_URL = ''; 

// 1. ИНИЦИАЛИЗАЦИЯ (ПРИ ВХОДЕ)
window.onload = async () => {
    setTimeout(() => {
        // Убираем заставку через 2 сек
        document.getElementById('splash-screen').style.opacity = '0';
        setTimeout(() => document.getElementById('splash-screen').remove(), 500);
        document.getElementById('app').style.display = 'block';
    }, 2000);

    // Авторизация
    const tgUser = tg.initDataUnsafe.user;
    // Если тестируешь в браузере без ТГ, раскомментируй строку ниже:
    // const tgUser = { id: 12345, username: 'TestUser' };

    if (tgUser) {
        try {
            const response = await fetch(`${API_URL}/api/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    telegram_id: tgUser.id, 
                    username: tgUser.username 
                })
            });
            user = await response.json();
            updateUI();
        } catch (e) {
            alert('Ошибка соединения с сервером Black Russia');
        }
    } else {
        alert('Зайдите через Телеграм!');
    }
};

function updateUI() {
    document.getElementById('username').innerText = user.username.toUpperCase();
    document.getElementById('balance').innerText = user.balance;
}

// 2. ОТКРЫТИЕ КЕЙСА
async function openCaseMenu(caseKey) {
    if (isSpinning) return;
    
    // Запрос к серверу
    const response = await fetch(`${API_URL}/api/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user.telegram_id, caseType: caseKey })
    });

    const data = await response.json();
    if (data.error) {
        tg.showAlert(data.error); // Нативный алерт телеграма
        return;
    }

    // Успех - запускаем анимацию
    user.balance = data.newBalance; // Обновляем баланс локально сразу (визуально потом)
    startRoulette(data.wonItem);
}

// 3. АНИМАЦИЯ РУЛЕТКИ
function startRoulette(wonItem) {
    isSpinning = true;
    document.getElementById('open-screen').classList.remove('hidden');
    document.getElementById('win-message').classList.add('hidden');
    const track = document.getElementById('roulette-track');
    track.innerHTML = '';
    track.style.transition = 'none';
    track.style.transform = 'translateX(0)';

    // Генерируем фейковые предметы для ленты
    let itemsHtml = '';
    for(let i=0; i<30; i++) {
        itemsHtml += `<div class="roulette-item"><img src="assets/item_car.png"></div>`;
    }
    // 25-й элемент - наш выигрыш
    itemsHtml += `<div class="roulette-item" id="winner-card"><img src="assets/${wonItem.img}"></div>`;
    // Еще немного фейков
    for(let i=0; i<5; i++) {
        itemsHtml += `<div class="roulette-item"><img src="assets/item_money.png"></div>`;
    }
    track.innerHTML = itemsHtml;

    // Запуск прокрутки (CSS hack)
    setTimeout(() => {
        const cardWidth = 110; // ширина карточки + марджин
        // Смещаем так, чтобы winner-card встал по центру
        // 30 карточек до него * 110 = 3300px + половина экрана
        const offset = (30 * cardWidth) - (window.innerWidth / 2) + (cardWidth / 2);
        
        track.style.transition = 'transform 4s cubic-bezier(0.1, 1, 0.1, 1)'; // Плавное замедление
        track.style.transform = `translateX(-${offset}px)`;
    }, 100);

    // Показ результата
    setTimeout(() => {
        isSpinning = false;
        showWinScreen(wonItem);
        updateUI();
    }, 4500);
}

function showWinScreen(item) {
    document.getElementById('win-message').classList.remove('hidden');
    document.getElementById('win-name').innerText = item.name;
    document.getElementById('win-img').src = `assets/${item.img}`;
    
    // Вибрация телефона (Haptic Feedback)
    tg.HapticFeedback.notificationOccurred('success');
}

function closeOpenScreen() {
    document.getElementById('open-screen').classList.add('hidden');
}

// 4. РАСПЫЛЕНИЕ (Пример функции, нужно доработать передачу ID предмета)
function sellLastItem() {
    alert('Предмет распылен! (Демо)');
    closeOpenScreen();
    // Тут нужно сделать fetch запрос на /api/sell
}

function showScreen(id) {
    // Переключение экранов
}