const mapContainer = document.querySelector('.svg-turkiye-haritasi');
const questionText = document.getElementById('question-area');
const timerText = document.getElementById('timer');
const remainingText = document.getElementById('remaining');
const startBtn = document.getElementById('start-btn');
const gameTitle = document.getElementById('game-title');
const topBar = document.getElementById('top-bar');
const startArea = document.getElementById('start-area');
const welcomeText = document.getElementById('welcome-text');

let cities = [];
let currentTarget = null;
let mistakes = {};
let seconds = 0;
let timerInterval = null;
let totalAttempts = 0;
let initialCityCount = 0;

// 1. Haritayı ve Şehirleri Hazırla
function initCities() {
    const svgElement = document.querySelector('#svg-turkiye-haritasi');
    if(!svgElement) return false;

    const groups = svgElement.querySelectorAll('g[data-iladi]');
    cities = Array.from(groups).map(g => ({
        id: g.id,
        name: g.getAttribute('data-iladi'),
        el: g
    }));
    return cities.length > 0;
}

// 2. Zamanlayıcıyı Başlat/Durdur
function startTimer() {
    seconds = 0;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        seconds++;
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        timerText.textContent = `${mins}:${secs}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

// 3. Soru Sorma (Kopya vermeden)
function nextQuestion() {
    if (cities.length === 0) {
        stopTimer();
        const finalTime = timerText.textContent;
        
        topBar.style.display = 'none';
        gameTitle.style.display = 'block';
        startArea.style.display = 'block';
        
        const accuracy = totalAttempts > 0 ? Math.round((initialCityCount / totalAttempts) * 100) : 0;
        
        welcomeText.innerHTML = `🎉 Tebrikler! Haritayı tamamladın! 🎉<br><br>
            <span style="color:#27ae60; font-weight:bold;">⏳ Süre: ${finalTime}</span> &nbsp;&nbsp;|&nbsp;&nbsp; 
            <span style="color:#f39c12; font-weight:bold;">🎯 Doğruluk: %${accuracy}</span>`;
        startBtn.textContent = 'Tekrar Yarış';
        currentTarget = null;
        return;
    }
    const randomIndex = Math.floor(Math.random() * cities.length);
    currentTarget = cities[randomIndex];
    questionText.innerHTML = `<span style="color:#2c3e50">${currentTarget.name}</span>`;
}

// 4. Tıklama Kontrolü (Hata durumunda ipucu yok)
mapContainer.addEventListener('click', function(e) {
    if (!currentTarget) return;
    
    const clickedGroup = e.target.closest('g[data-iladi]');
    if (!clickedGroup) return;
    
    totalAttempts++;

    if (clickedGroup.id === currentTarget.id) {
        // DOĞRU
        const mistakeCount = mistakes[currentTarget.id] || 0;
        if (mistakeCount === 0) {
            clickedGroup.classList.add('correct-city-green');
        } else if (mistakeCount <= 2) {
            clickedGroup.classList.add('correct-city-yellow');
        } else {
            clickedGroup.classList.add('correct-city-red');
        }
        
        cities = cities.filter(c => c.id !== currentTarget.id);
        remainingText.textContent = cities.length;
        
        questionText.innerHTML = `<span style="color:#27ae60; font-size: 1.2em;">Doğru!</span>`;
        
        let tempTarget = currentTarget;
        currentTarget = null; // Animasyon sırasında başka tıklamayı engelle
        
        setTimeout(() => {
            nextQuestion();
        }, 600);
        
    } else {
        // YANLIŞ
        mistakes[currentTarget.id] = (mistakes[currentTarget.id] || 0) + 1;
        
        clickedGroup.classList.add('wrong-city');
        setTimeout(() => clickedGroup.classList.remove('wrong-city'), 500);
        
        questionText.innerHTML = `<span style="color:#e74c3c">Yanlış!</span> <span style="color:#2c3e50">${currentTarget.name}</span>`;
    }
});

// BAŞLAT BUTONU
startBtn.addEventListener('click', () => {
    if (!initCities()) {
        alert("Lütfen önce SVG kodlarını index.html içine yapıştırın!");
        return;
    }
    
    mistakes = {};
    totalAttempts = 0;
    initialCityCount = cities.length;
    remainingText.textContent = cities.length;
    
    // Tüm şehirleri rengine geri döndür
    document.querySelectorAll('g').forEach(g => g.classList.remove('correct-city', 'correct-city-green', 'correct-city-yellow', 'correct-city-red', 'wrong-city'));
    
    gameTitle.style.display = 'none';
    startArea.style.display = 'none';
    topBar.style.display = 'flex';
    
    startTimer();
    nextQuestion();
});

// NOT: Mouseover (isim gösterme) kodları tamamen kaldırıldı.