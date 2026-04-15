# PROJE DETAYLARI: Türkiye Şehir Bulma Oyunu

## 1. Proje Özeti
Bu proje, harici bir kütüphane (React, Vue, jQuery vb.) kullanılmadan tamamen **Vanilla HTML, CSS ve JavaScript** ile geliştirilmiş interaktif bir coğrafya/harita oyunudur. Temel amaç, kullanıcının rastgele sorulan şehirleri dilsiz Türkiye haritası (SVG) üzerinde bularak en kısa sürede oyunu tamamlamasıdır.

## 2. Mimari ve Dosya Yapısı
Proje 3 temel dosyadan oluşmaktadır:
* **`index.html`:** Oyunun UI (Kullanıcı Arayüzü) iskeletini ve oyun alanını barındırır. **Kritik Not:** Türkiye haritasının tamamı, `index.html` içindeki bir `div` içerisine inline (satıriçi) `<svg>` olarak gömülüdür. 
* **`style.css`:** UI tasarımlarını, haritanın genel "dilsiz" görünümünü ve tıklama sonrası oluşan animasyonlu durum (state) renklerini kontrol eder.
* **`script.js`:** Oyun döngüsünü (Game Loop), zamanlayıcıyı, skor takibini ve DOM manipülasyonlarını yönetir.

## 3. Veri Yapısı (SVG Entegrasyonu)
Oyun, veri tabanı veya JSON dosyası kullanmaz. Şehir verilerini doğrudan DOM (SVG) üzerinden çeker.
* Haritadaki her bir il `<g>` (grup) etiketi ile sarmalanmıştır.
* Şehir isimleri okumak için **`data-iladi`** attribute'u kullanılır (Örn: `<g id="ankara" data-iladi="Ankara">`).
* `script.js` başlatıldığında, `g[data-iladi]` etiketlerini tarayarak bir `cities` array'i (dizisi) oluşturur.

## 4. Oyun Mantığı ve State (Durum) Yönetimi
* **`cities` (Array):** Bulunmayı bekleyen şehirlerin listesi. Doğru bilinen şehir bu diziden `.filter()` ile çıkarılır (aynı şehrin tekrar sorulmaması için).
* **`currentTarget` (Object):** O an ekranda sorulan hedef şehir.
* **`score` / `total` (Int):** Skor yönetimi.
* **Zamanlayıcı (Timer):** Oyun "Başlat" butonuna basıldığı an `setInterval` ile çalışır. Dizi boşaldığında (oyun bittiğinde) durur ve bitiş ekranında toplam süre gösterilir.

## 5. Kesin Kurallar ve Kısıtlamalar (Geliştirici Notları)
Projeyi geliştirirken aşağıdaki kurallar **kesinlikle korunmalıdır**:

1. **Kopya Engeli (No Hover Hint):** Haritadaki illerin üzerine fare ile gelindiğinde (`mouseover` / `hover`) şehrin ismini gösteren ipuçları **kaldırılmıştır**. CSS'te sadece ufak bir `opacity` değişimi vardır. Bu kurala sadık kalınmalıdır.
2. **Yanlış Cevap Gizliliği:** Kullanıcı yanlış bir şehre tıkladığında ekranda sadece **"Yanlış!"** uyarısı çıkmalıdır. Tıklanan yanlış şehrin adı (Örn: "Hayır orası Yozgat") **kesinlikle gösterilmemelidir.** (Kullanıcının haritayı deneme yanılma ile ezberlemesini önlemek için).
3. **Dilsiz Harita Tasarımı:** Tüm bölgelerin ve illerin başlangıç rengi CSS üzerinden gri (`#cccccc`) olarak ayarlanmıştır.
4. **State Renkleri (CSS Class'ları):**
   * `.correct-city`: Doğru bilinen il kalıcı olarak yeşil (`#27ae60`) kalır.
   * `.wrong-city`: Yanlış bilinen il geçici olarak (`setTimeout` ile 500ms) kırmızı (`#e74c3c`) olur ve eski rengine döner.

