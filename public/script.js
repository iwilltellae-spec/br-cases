const tg = window.Telegram.WebApp;
tg.expand();

let user = null;
let isSpinning = false;
const API_URL = ''; // Если на Render, оставляем пустым

// 1. ИНИЦИАЛИЗАЦИЯ
window.onload = async () => {
    // Ждем, пока юзер нажмет кнопку "НАЧАТЬ"
    // Но данные подгружаем сразу в фоне
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
        user = await response.json();
        updateUI();
    } catch (e) {
        console.error('Ошибка сервера', e);
    }
};

// Функция кнопки "НАЧАТЬ"
function startGame() {
    if (!user) {
        tg.showAlert('Соединение с сервером...');
        return;
    }
    // Плавно скрываем приветствие
    const welcome = document.getElementById('welcome-screen');
    welcome.style.transition = 'opacity 0.5s';
    welcome.style.opacity = '0';
    
    setTimeout(() => {
        welcome.style.display = 'none';
        document.getElementById('app').classList.remove('hidden');
    }, 500);
}

function updateUI() {
    if(!user) return;
    document.getElementById('username').innerText = user.username;
    document.getElementById('balance').innerText = user.balance.toLocaleString(); // Красивые цифры с пробелами
}

// 2. ОТКРЫТИЕ КЕЙСА
async function openCaseMenu(caseKey) {
    if (isSpinning) return;
    
    // Вибрация при нажатии
    tg.HapticFeedback.impactOccurred('medium');

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

    user.balance = data.newBalance;
    updateUI(); // Баланс списывается сразу
    startRoulette(data.wonItem);
}

// 3. АНИМАЦИЯ РУЛЕТКИ
function startRoulette(wonItem) {
    isSpinning = true;
    const openScreen = document.getElementById('open-screen');
    openScreen.classList.remove('hidden');
    document.getElementById('win-message').classList.add('hidden');
    
    const track = document.getElementById('roulette-track');
    track.innerHTML = '';
    track.style.transition = 'none';
    track.style.transform = 'translateX(0)';

    // Генерируем ленту
    let itemsHtml = '';
    // Массив картинок для "мусора" в рулетке
    const randomImgs = ['item_car.png', 'item_money.png']; 

    for(let i=0; i<45; i++) {
        const rnd = randomImgs[Math.floor(Math.random() * randomImgs.length)];
        itemsHtml += `<div class="roulette-item"><img src="assets/${rnd}"></div>`;
    }
    // 35-й элемент - выигрыш
    itemsHtml += `<div class="roulette-item" id="winner-card"><img src="assets/${wonItem.img}"></div>`;
    
    for(let i=0; i<5; i++) {
        const rnd = randomImgs[Math.floor(Math.random() * randomImgs.length)];
        itemsHtml += `<div class="roulette-item"><img src="assets/${rnd}"></div>`;
    }
    track.innerHTML = itemsHtml;

    // Считаем смещение
    // 90px ширина + 10px отступ = 100px на элемент
    // Хотим 35-й элемент по центру
    setTimeout(() => {
        const itemWidth = 100;
        // Смещаем на 35 элементов минус половина экрана
        const offset = (35 * itemWidth) - (window.innerWidth / 2) + (itemWidth / 2);
        
        track.style.transition = 'transform 5s cubic-bezier(0.15, 0.9, 0.3, 1)'; // Плавная остановка
        track.style.transform = `translateX(-${offset}px)`;
        
        // Звуки "тыр-тыр" можно добавить сюда через tg.HapticFeedback.selectionChanged() в цикле
    }, 50);

    setTimeout(() => {
        isSpinning = false;
        showWinScreen(wonItem);
        tg.HapticFeedback.notificationOccurred('success'); // Вибрация успеха
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

function sellLastItem() {
    // Демо
    tg.showAlert('Предмет продан за ' + Math.floor(Math.random()*500));
    closeOpenScreen();
}