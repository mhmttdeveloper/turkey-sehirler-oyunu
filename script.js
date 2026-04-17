/* ========================================================
   TÜRKİYE ŞEHİR BULMA OYUNU - OYUN + MOBİL ZOOM/PAN
   ======================================================== */

// === DOM REFERANSLARİ ===
const questionText   = document.getElementById('question-area');
const timerText      = document.getElementById('timer');
const remainingText  = document.getElementById('remaining');
const startBtn       = document.getElementById('start-btn');
const gameTitle      = document.getElementById('game-title');
const topBar         = document.getElementById('top-bar');
const startArea      = document.getElementById('start-area');
const welcomeText    = document.getElementById('welcome-text');
const mapContainer   = document.querySelector('.svg-turkiye-haritasi');
const svgEl          = document.getElementById('svg-turkiye-haritasi');

// === OYUN DEĞİŞKENLERİ ===
let cities         = [];
let currentTarget  = null;
let mistakes       = {};
let seconds        = 0;
let timerInterval  = null;
let totalAttempts  = 0;
let initialCityCount = 0;

// === OYUN FONKSİYONLARI ===

function initCities() {
    if (!svgEl) return false;
    const groups = svgEl.querySelectorAll('g[data-iladi]');
    cities = Array.from(groups).map(g => ({
        id: g.id,
        name: g.getAttribute('data-iladi'),
        el: g
    }));
    return cities.length > 0;
}

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

function stopTimer() { clearInterval(timerInterval); }

function nextQuestion() {
    if (cities.length === 0) {
        stopTimer();
        const finalTime = timerText.textContent;
        topBar.style.display    = 'none';
        gameTitle.style.display = 'block';
        startArea.style.display = 'block';
        const accuracy = totalAttempts > 0
            ? Math.round((initialCityCount / totalAttempts) * 100)
            : 0;
        welcomeText.innerHTML = `<span class="msg-title">🎉 Harika İş Çıkardın! 🎉</span>
            <span class="msg-timer">⏳ Süre: ${finalTime}</span>
            <br><br>
            <span class="msg-accuracy">🎯 Doğruluk: %${accuracy}</span>`;
        startBtn.textContent = 'Tekrar Yarış';
        currentTarget = null;
        return;
    }
    const idx = Math.floor(Math.random() * cities.length);
    currentTarget = cities[idx];
    questionText.innerHTML = `<span class="msg-question">${currentTarget.name}</span>`;
}

// Yanlış/doğru tıklama işleyicisi — hem mouse click hem touch tap için ortak
let lastHandledTime = 0;

function handleCityClick(clickedGroup) {
    if (!currentTarget || !clickedGroup) return;
    // Debounce: touch tap + sonraki click event'inin çift tetiklememesi için
    const now = Date.now();
    if (now - lastHandledTime < 400) return;
    lastHandledTime = now;

    totalAttempts++;

    if (clickedGroup.id === currentTarget.id) {
        // DOĞRU
        const mistakeCount = mistakes[currentTarget.id] || 0;
        if (mistakeCount === 0)       clickedGroup.classList.add('correct-city-green');
        else if (mistakeCount <= 2)   clickedGroup.classList.add('correct-city-yellow');
        else                          clickedGroup.classList.add('correct-city-red');

        cities = cities.filter(c => c.id !== currentTarget.id);
        remainingText.textContent = cities.length;
        questionText.innerHTML = `<span class="msg-correct">Doğru! ✓</span>`;
        currentTarget = null;
        setTimeout(() => nextQuestion(), 600);

    } else {
        // YANLIŞ
        mistakes[currentTarget.id] = (mistakes[currentTarget.id] || 0) + 1;
        clickedGroup.classList.add('wrong-city');
        setTimeout(() => clickedGroup.classList.remove('wrong-city'), 500);
        questionText.innerHTML = `<span class="msg-wrong-red">Yanlış!</span> <span class="msg-wrong-blue">${currentTarget.name}</span>`;
    }
}

// DESKTOP: Mouse tıklama
mapContainer.addEventListener('click', function(e) {
    if (!currentTarget) return;
    if (mouseWasDragged) { mouseWasDragged = false; return; } // sürükleme ise atla
    const clickedGroup = e.target.closest('g[data-iladi]');
    handleCityClick(clickedGroup);
});

// BAŞLAT BUTONU
startBtn.addEventListener('click', () => {
    if (!initCities()) {
        alert('Lütfen önce SVG kodlarını index.html içine yapıştırın!');
        return;
    }
    mistakes       = {};
    totalAttempts  = 0;
    initialCityCount = cities.length;
    remainingText.textContent = cities.length;

    document.querySelectorAll('g').forEach(g =>
        g.classList.remove('correct-city', 'correct-city-green',
                           'correct-city-yellow', 'correct-city-red', 'wrong-city')
    );

    gameTitle.style.display = 'none';
    startArea.style.display = 'none';
    topBar.style.display    = 'flex';

    resetZoom();
    startTimer();
    nextQuestion();
});

/* ========================================================
   MOBİL PAN & ZOOM SİSTEMİ
   ======================================================== */

let scale      = 1;
let translateX = 0;
let translateY = 0;

let MIN_SCALE = 1;
let MAX_SCALE = 6;

function updateScaleLimits() {
    if (window.innerWidth <= 768) {
        MIN_SCALE = 2; // Mobilde genişliğin yarısı kadarını göstermek için
        MAX_SCALE = 8;
    } else {
        MIN_SCALE = 1;
        MAX_SCALE = 6;
    }
}

/** SVG elemanına transform uygula */
function applyTransform() {
    if (!svgEl) return;
    svgEl.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}

/** Haritanın görüntü dışına çıkmaması için koordinatları sınırla */
function clampTranslate() {
    const { width, height } = mapContainer.getBoundingClientRect();
    translateX = Math.max(width  * (1 - scale), Math.min(0, translateX));
    translateY = Math.max(height * (1 - scale), Math.min(0, translateY));
}

/**
 * Belirli bir ekran noktasına (originX, originY) doğru zoom yap
 * @param {number} newScale - Hedef zoom seviyesi
 * @param {number} originX  - Container içi X koordinatı (zoom merkezi)
 * @param {number} originY  - Container içi Y koordinatı (zoom merkezi)
 */
function doZoom(newScale, originX, originY) {
    const old = scale;
    scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
    if (Math.abs(scale - old) < 0.0001) return;

    // Zoom merkezini koruyacak şekilde translate'i ayarla
    translateX = originX - (originX - translateX) * (scale / old);
    translateY = originY - (originY - translateY) * (scale / old);

    clampTranslate();
    applyTransform();
    refreshZoomUI();
}

/** Zoom'u sıfırla */
function resetZoom() {
    updateScaleLimits();
    scale = MIN_SCALE; 
    const rect = mapContainer.getBoundingClientRect();
    // Min_scale > 1 ise (mobilde) en azından ortalı gelsin
    translateX = (rect.width - (rect.width * scale)) / 2; 
    translateY = (rect.height - (rect.height * scale)) / 2;
    
    clampTranslate();
    applyTransform();
    refreshZoomUI();
}

function refreshZoomUI() {
    const btnIn    = document.getElementById('zoom-in');
    const btnOut   = document.getElementById('zoom-out');
    const btnReset = document.getElementById('zoom-reset');
    if (btnIn)    btnIn.disabled    = scale >= MAX_SCALE;
    if (btnOut)   btnOut.disabled   = scale <= MIN_SCALE;
    if (btnReset) btnReset.style.opacity = scale > (MIN_SCALE + 0.01) ? '1' : '0.4';
}

/* --------------------------------------------------------
   TOUCH OLAYLARI (Mobil: pinch zoom + tek parmak pan + tap)
   -------------------------------------------------------- */

let touchStartX = 0, touchStartY = 0;
let touchLastX  = 0, touchLastY  = 0;
let pinchDist   = null;
let touchMoved  = false;          // true ise tap değil, pan/pinch'tir

mapContainer.addEventListener('touchstart', e => {
    touchMoved = false;
    if (e.touches.length === 1) {
        touchStartX = touchLastX = e.touches[0].clientX;
        touchStartY = touchLastY = e.touches[0].clientY;
        pinchDist = null;
    } else if (e.touches.length === 2) {
        pinchDist = getPinchDist(e.touches[0], e.touches[1]);
    }
}, { passive: true });

mapContainer.addEventListener('touchmove', e => {
    e.preventDefault(); // Sayfanın scroll olmasını engelle

    if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchLastX;
        const dy = e.touches[0].clientY - touchLastY;

        // 10px'den fazla hareket → bu bir tap değil, pan'dır
        if (Math.abs(e.touches[0].clientX - touchStartX) > 10 ||
            Math.abs(e.touches[0].clientY - touchStartY) > 10) {
            touchMoved = true;
        }

        // Pan: sadece zoom yapılmışken çalışır
        if (scale > 1 && touchMoved) {
            translateX += dx;
            translateY += dy;
            clampTranslate();
            applyTransform();
        }

        touchLastX = e.touches[0].clientX;
        touchLastY = e.touches[0].clientY;

    } else if (e.touches.length === 2 && pinchDist !== null) {
        // PINCH ZOOM
        touchMoved = true;
        const newDist = getPinchDist(e.touches[0], e.touches[1]);
        const rect    = mapContainer.getBoundingClientRect();
        const midX    = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const midY    = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

        doZoom(scale * (newDist / pinchDist), midX, midY);
        pinchDist = newDist;
    }
}, { passive: false });

mapContainer.addEventListener('touchend', e => {
    // Tüm parmaklar kalktı + hareket yoksa → TAP (şehir tıklaması)
    if (e.touches.length === 0 && !touchMoved && e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const el    = document.elementFromPoint(touch.clientX, touch.clientY);
        if (el && currentTarget) {
            const clickedGroup = el.closest('g[data-iladi]');
            if (clickedGroup) handleCityClick(clickedGroup);
        }
    }
    if (e.touches.length < 2) pinchDist = null;
}, { passive: true });

function getPinchDist(t1, t2) {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
}

/* --------------------------------------------------------
   MOUSE OLAYLARI (Desktop: tekerlek zoom + sürükle pan)
   -------------------------------------------------------- */

let mouseWasDragged = false;
let mDragging       = false;
let mLastX = 0, mLastY = 0;
let mStartX = 0, mStartY = 0;

// Tekerlek ile zoom (desktop)
mapContainer.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = mapContainer.getBoundingClientRect();
    const ox   = e.clientX - rect.left;
    const oy   = e.clientY - rect.top;
    doZoom(scale * (e.deltaY < 0 ? 1.15 : 0.87), ox, oy);
}, { passive: false });

// Mouse sürükle ile pan (desktop, zoom yapılmışken)
mapContainer.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    mDragging = true; mouseWasDragged = false;
    mStartX = mLastX = e.clientX;
    mStartY = mLastY = e.clientY;
});

window.addEventListener('mousemove', e => {
    if (!mDragging || scale <= 1) return;
    const dx = e.clientX - mLastX;
    const dy = e.clientY - mLastY;
    if (Math.abs(e.clientX - mStartX) > 5 ||
        Math.abs(e.clientY - mStartY) > 5) mouseWasDragged = true;
    if (mouseWasDragged) {
        translateX += dx; translateY += dy;
        clampTranslate(); applyTransform();
    }
    mLastX = e.clientX; mLastY = e.clientY;
});

window.addEventListener('mouseup', () => { mDragging = false; });

/* --------------------------------------------------------
   ZOOM BUTONLARI
   -------------------------------------------------------- */

document.getElementById('zoom-in')?.addEventListener('click', e => {
    e.stopPropagation();
    doZoom(scale * 1.6, mapContainer.clientWidth / 2, mapContainer.clientHeight / 2);
});

document.getElementById('zoom-out')?.addEventListener('click', e => {
    e.stopPropagation();
    doZoom(scale / 1.6, mapContainer.clientWidth / 2, mapContainer.clientHeight / 2);
});

document.getElementById('zoom-reset')?.addEventListener('click', e => {
    e.stopPropagation();
    resetZoom();
});

/* --------------------------------------------------------
   MOBİL İPUCU: İlk açılışta "pinch to zoom" yazısı göster
   -------------------------------------------------------- */

(function showMobileHint() {
    if (!('ontouchstart' in window)) return; // sadece dokunmatik cihazlar
    const hint = document.getElementById('zoom-hint');
    if (!hint) return;
    hint.classList.add('visible');              // önce g\u00f6ster
    setTimeout(() => hint.classList.add('hidden'), 3000);   // 3s sonra solar
    setTimeout(() => hint.classList.remove('visible'), 4500); // 4.5s sonra DOM'dan çık
})();

// Başlangıç UI durumu
refreshZoomUI();

/* --------------------------------------------------------
   Oyun Sitesi (Portal) Tam Ekran ve viewBox Ayarı
   -------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    // 1. TAM EKRAN (Fullscreen) Modu
    const fsBtn = document.getElementById('fullscreen-btn');
    const gameFrame = document.getElementById('game-frame');

    if (fsBtn && gameFrame) {
        fsBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                if (gameFrame.requestFullscreen) {
                    gameFrame.requestFullscreen();
                } else if (gameFrame.webkitRequestFullscreen) { /* Safari */
                    gameFrame.webkitRequestFullscreen();
                } else if (gameFrame.msRequestFullscreen) { /* IE11 */
                    gameFrame.msRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) { /* Safari */
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) { /* IE11 */
                    document.msExitFullscreen();
                }
            }
        });

        // Tam ekran durumu değiştiğinde buton metnini/ikonunu güncelle
        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement) {
                fsBtn.innerHTML = '✖ Çıkış';
            } else {
                fsBtn.innerHTML = '⛶ Tam Ekran';
            }
        });
    }

    // 2. TEMA (Mod) DEĞİŞTİRİCİ
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn && gameFrame) {
        themeBtn.addEventListener('click', () => {
            gameFrame.classList.toggle('dark-mode');
            if (gameFrame.classList.contains('dark-mode')) {
                themeBtn.innerHTML = '☀ Açık Mod';
            } else {
                themeBtn.innerHTML = '🌙 Koyu Mod';
            }
        });
    }

    // 3. SVG viewBox'unu İçeriğe Göre Daralt (Sağ/Sol/Alt gereksiz boşlukları siler)
    // Sadece bir kez DOM hazır olduğunda hesapla.
    setTimeout(() => {
        if (svgEl) {
            try {
               // SVG üzerindeki tüm çizilmiş yolların uç sınırlarını hesaplar
               const bbox = svgEl.getBBox();
               
               // Kenarlara çok yapışmaması için %1-2 arası ufak pay ekleyelim
               const paddingX = bbox.width * 0.01;
               const paddingY = bbox.height * 0.01;
               
               const newX = bbox.x - paddingX;
               const newY = Math.max(0, bbox.y - paddingY); // Üstü fazla kesmeyelim diye garantiye alıyoruz
               const newW = bbox.width + (paddingX * 2);
               const newH = bbox.height + (paddingY * 2);
               
               // Yeni (kırpılmış) görünüm kutusunu (viewBox) uygula
               svgEl.setAttribute('viewBox', `${newX} ${newY} ${newW} ${newH}`);
               
               // Başlangıçta sınırları (mobil scale) ayarlayıp ortalaması için
               resetZoom();
            } catch(e) {
               console.log("Harita kenar boşlukları hesaplanırken küçük bir hata oluştu: ", e);
            }
        }
    }, 150);

    // Pencere boyutu/tam ekran durumu değişirse mobil scaleları yeniden denetle
    window.addEventListener('resize', () => {
        const oldMin = MIN_SCALE;
        updateScaleLimits();
        if (scale < MIN_SCALE) {
            resetZoom();
        }
    });

});