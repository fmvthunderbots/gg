/* ==========================================================================
   TITANIUM FINANCE - AI CREDIT CARD & INSTALLMENT SCANNER
   Powered by Google Gemini Multimodal Vision API
   Specialized in Turkish banking statements & future installment schedules
   ========================================================================== */

let uploadedImageBase64 = null;
let uploadedImageMime = null;
let aiAnalysisResults = null;

// Populate credit card / expense dropdown dynamically
function updateAICardOptions() {
    const select = document.getElementById("aiCardSelect");
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = "";

    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "— Kredi Kartı veya Gider Sütunu Seçin —";
    select.appendChild(defaultOpt);

    if (currentData && currentData.expenseHeaders) {
        currentData.expenseHeaders.forEach(header => {
            const opt = document.createElement("option");
            opt.value = header;
            opt.textContent = header;
            select.appendChild(opt);
        });
    }

    if (currentVal && Array.from(select.options).some(o => o.value === currentVal)) {
        select.value = currentVal;
    } else if (select.options.length > 1) {
        // Preselect the first card (e.g. İş Bankası Batı or Axess)
        const isBank = Array.from(select.options).find(o => o.value.toLowerCase().includes("iş bank") || o.value.toLowerCase().includes("axess"));
        select.value = isBank ? isBank.value : select.options[1].value;
    }
}

// File Drag & Drop & Upload Handlers
function setupAIUploadListeners() {
    const dropzone = document.getElementById("aiDropzone");
    const fileInput = document.getElementById("aiFileInput");
    const previewContainer = document.getElementById("aiPreviewContainer");
    const previewImg = document.getElementById("aiPreviewImg");
    const removeBtn = document.getElementById("aiRemoveImgBtn");

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener("click", () => fileInput.click());

    dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", () => {
        dropzone.classList.remove("dragover");
    });

    dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleImageFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) {
            handleImageFile(e.target.files[0]);
        }
    });

    // Clipboard Paste (Ctrl+V) anywhere on the page
    window.addEventListener("paste", (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
            if (item.type.indexOf("image") !== -1) {
                const blob = item.getAsFile();
                handleImageFile(blob);
                showToast("📋 Ekran görüntüsü panodan yüklendi!");
                // Switch to AI tab if not already on it
                switchTab('tab-ai');
                break;
            }
        }
    });

    if (removeBtn) {
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            clearUploadedImage();
        });
    }
}

function handleImageFile(file) {
    if (!file.type.startsWith("image/")) {
        alert("Lütfen geçerli bir resim dosyası yükleyin (JPG, PNG, WebP).");
        return;
    }

    uploadedImageMime = file.type;
    const reader = new FileReader();
    reader.onload = function(e) {
        const fullBase64 = e.target.result;
        // Strip data:image/...;base64, prefix for Gemini API payload
        uploadedImageBase64 = fullBase64.split(",")[1];

        const previewContainer = document.getElementById("aiPreviewContainer");
        const previewImg = document.getElementById("aiPreviewImg");
        const dropzonePrompt = document.getElementById("dropzonePrompt");

        if (previewImg && previewContainer) {
            previewImg.src = fullBase64;
            previewContainer.style.display = "block";
            if (dropzonePrompt) dropzonePrompt.style.display = "none";
        }
        showToast("📸 Ekstre görseli başarıyla yüklendi!");
    };
    reader.readAsDataURL(file);
}

function clearUploadedImage() {
    uploadedImageBase64 = null;
    uploadedImageMime = null;
    const fileInput = document.getElementById("aiFileInput");
    if (fileInput) fileInput.value = "";
    
    const previewContainer = document.getElementById("aiPreviewContainer");
    const previewImg = document.getElementById("aiPreviewImg");
    const dropzonePrompt = document.getElementById("dropzonePrompt");

    if (previewContainer) previewContainer.style.display = "none";
    if (previewImg) previewImg.src = "";
    if (dropzonePrompt) dropzonePrompt.style.display = "block";
}

// ==========================================================================
// GEMINI API REASONING ENGINE
// ==========================================================================

async function runAIAnalysis() {
    const cardSelect = document.getElementById("aiCardSelect");
    const selectedCard = cardSelect ? cardSelect.value : "";
    const userNotes = document.getElementById("aiUserNotes") ? document.getElementById("aiUserNotes").value : "";

    if (!selectedCard) {
        alert("Lütfen ekstrenin ait olduğu kredi kartını veya gider sütununu seçin.");
        cardSelect.focus();
        return;
    }

    if (!uploadedImageBase64) {
        alert("Lütfen kredi kartı ekstre veya taksit ekran görüntüsünü yükleyin.");
        return;
    }

    const apiKey = localStorage.getItem("geminiApiKey") || "";
    if (!apiKey) {
        // Prompt user to enter their free Gemini API Key
        openApiKeyModal();
        return;
    }

    const btn = document.getElementById("aiAnalyzeBtn");
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Yapay Zeka Çözümlüyor...`;

    try {
        const availableMonths = currentData.rows.map(r => r.month).join(", ");
        const promptText = `
Sen Türkiye'deki bankacılık ve kredi kartı ekstreleri konusunda uzman bir finansal yapay zeka asistanısın.
Kullanıcı seçtiği kredi kartı: "${selectedCard}"
Kullanıcının bütçe tablosundaki aylar: [${availableMonths}]
Kullanıcının varsa özel notu: "${userNotes}"

GÖREV:
Görseldeki kredi kartı ekstresini, dönem borcunu, asgari tutarı, toplam borcu ve özellikle "Gelecek Taksitler / Dönemler" dökümünü çok dikkatle incele ve çözümle.

ÖZEL FİNANSAL MUHAKEME KURALLARI:
1. Bazı Türk bankaları (İş Bankası, Garanti, Yapı Kredi, Akbank, QNB vs.) ekstreleri karmaşık gösterir:
   - Örneğin ekranda "Toplam Borç" (veya Güncel Kart Borcu) ve "Gelecek Taksitler Toplamı" yazar. Bu durumda CARİ AY (Şubat) BORCU = Toplam Borç - Gelecek Taksitler Toplamı olarak hesaplanmalıdır!
   - Eğer ekstrede doğrudan "Dönem Borcu" veya "Asgari Ödeme" ve altında gelecek ayların taksit listesi (örn: Mart: 8.500 TL, Nisan: 8.500 TL, Mayıs: 4.200 TL) varsa, cari ay borcu ve sonraki ayların taksitleri tek tek ayrıştırılmalıdır.
   - Eğer birden fazla taksitli harcama aynı aya denk geliyorsa (örneğin Mart ayında hem beyaz eşya 3.000 TL hem telefon 4.000 TL taksiti varsa), o ay için TUTARLARI TOPLA.
2. Ay isimlerini kullanıcının tablosundaki ay isimleriyle tam eşleştir: [${availableMonths}].
3. Türkçe anlaşılır bir muhakeme açıklaması (reasoning) yaz: Kullanıcıya toplam borcun ne olduğunu, gelecek taksitlerin ne olduğunu, cari ay borcunun nasıl hesaplandığını ve gelecek aylara ne kadar düştüğünü şeffafça anlat.

ÇIKTI FORMATI:
SADECE ve YALNIZCA aşağıdaki geçerli JSON formatında yanıt ver, markdown backtick veya fazladan metin ekleme:
{
  "reasoning": "Ayrıntılı Türkçe muhakeme ve hesaplama açıklaması...",
  "detectedCard": "${selectedCard}",
  "totalDebtFound": 0,
  "futureInstallmentsTotal": 0,
  "items": [
    {
      "month": "Şubat",
      "amount": 14500,
      "note": "Cari Dönem Borcu (Toplam Borç - Gelecek Taksitler)"
    },
    {
      "month": "Mart",
      "amount": 10250,
      "note": "Taksitler Toplamı"
    }
  ]
}
`;

        const modelsToTry = [
            "gemini-2.5-flash",
            "gemini-1.5-flash",
            "gemini-2.0-flash"
        ];

        let resultJson = null;
        let lastError = null;

        for (let modelName of modelsToTry) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    { text: promptText },
                                    {
                                        inline_data: {
                                            mime_type: uploadedImageMime || "image/jpeg",
                                            data: uploadedImageBase64
                                        }
                                    }
                                ]
                            }
                        ],
                        generationConfig: {
                            temperature: 0.1,
                            response_mime_type: "application/json"
                        }
                    })
                });

                if (!response.ok) {
                    const errBody = await response.text();
                    lastError = new Error(`HTTP ${response.status}: ${errBody}`);
                    continue; // Try next model
                }

                const data = await response.json();
                const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!candidateText) throw new Error("Yapay zekadan boş yanıt geldi.");

                // Parse JSON safely
                const cleanJsonStr = candidateText.replace(/```json/g, '').replace(/```/g, '').trim();
                resultJson = JSON.parse(cleanJsonStr);
                break; // Success!
            } catch (err) {
                lastError = err;
            }
        }

        if (!resultJson) {
            throw lastError || new Error("Gemini API ile iletişim kurulamadı.");
        }

        displayAIReview(resultJson, selectedCard);
        showToast("✨ Yapay zeka ekstre ve taksitleri başarıyla çözümledi!");

    } catch (error) {
        console.error("AI Error:", error);
        alert("Yapay Zeka Analiz Hatası: " + error.message + "\n\nLütfen API anahtarınızın geçerli olduğunu veya internet bağlantınızı kontrol edin.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// ==========================================================================
// INTERACTIVE DEMO / TEST MODE
// Allows testing the whole flow instantly without real API / images
// ==========================================================================

function runAIDemo(sampleType = "isbank") {
    const cardSelect = document.getElementById("aiCardSelect");
    if (!cardSelect) return;

    let targetCard = "İş Bankası Batı";
    if (Array.from(cardSelect.options).some(o => o.value.toLowerCase().includes("iş bank"))) {
        targetCard = Array.from(cardSelect.options).find(o => o.value.toLowerCase().includes("iş bank")).value;
    } else if (cardSelect.options.length > 1) {
        targetCard = cardSelect.options[1].value;
    }
    cardSelect.value = targetCard;

    let demoResult = null;

    if (sampleType === "isbank") {
        demoResult = {
            reasoning: `📸 İş Bankası Maximum kart ekstresi analiz edildi:\n` +
                       `• Toplam Kart Borcu: 48.600 ₺ tespit edildi.\n` +
                       `• Gelecek Dönem Taksitleri Toplamı: 31.200 ₺ olarak okundu.\n` +
                       `• Finansal Kural Uygulandı: Cari Ay (Şubat) Borcu = Toplam Borç - Gelecek Taksitler = 17.400 ₺.\n` +
                       `• Sonraki 3 aya ait taksit dökümleri ayrıştırıldı: Mart (12.400 ₺), Nisan (10.800 ₺), Mayıs (8.000 ₺).`,
            detectedCard: targetCard,
            items: [
                { month: "Şubat", amount: 17400, note: "Cari Ay Kalan Borç (48.600 ₺ - 31.200 ₺)" },
                { month: "Mart", amount: 12400, note: "Taksitler: Beyaz Eşya (2/6) + Uçak Bileti (1/3)" },
                { month: "Nisan", amount: 10800, note: "Taksitler: Beyaz Eşya (3/6) + Uçak Bileti (2/3)" },
                { month: "Mayıs", amount: 8000, note: "Taksitler: Beyaz Eşya (4/6) + Giyim" }
            ]
        };
    } else {
        demoResult = {
            reasoning: `📸 Garanti BBVA Bonus ekstre ve taksit planı analiz edildi:\n` +
                       `• Dönem Borcu: 13.750 ₺ (Şubat).\n` +
                       `• Gelecek 4 ay taksit planı tespit edildi: Mart (9.500 ₺), Nisan (9.500 ₺), Mayıs (7.200 ₺), Haziran (5.000 ₺).`,
            detectedCard: targetCard,
            items: [
                { month: "Şubat", amount: 13750, note: "Ekstre Dönem Borcu" },
                { month: "Mart", amount: 9500, note: "Gelecek Taksitler" },
                { month: "Nisan", amount: 9500, note: "Gelecek Taksitler" },
                { month: "Mayıs", amount: 7200, note: "Gelecek Taksitler" },
                { month: "Haziran", amount: 5000, note: "Son Taksit" }
            ]
        };
    }

    displayAIReview(demoResult, targetCard);
    showToast("🧪 Örnek ekstre başarıyla simüle edildi! Kontrol edip tabloya aktarabilirsiniz.");
}

// ==========================================================================
// INTERACTIVE VERIFICATION & ADJUSTMENT TABLE (KONTROL VE DÜZELTME)
// ==========================================================================

function displayAIReview(resultJson, selectedCard) {
    aiAnalysisResults = resultJson;
    const reviewPanel = document.getElementById("aiReviewPanel");
    const reasoningText = document.getElementById("aiReasoningText");
    const tbody = document.getElementById("aiReviewTableBody");

    if (!reviewPanel || !reasoningText || !tbody) return;

    reasoningText.innerHTML = (resultJson.reasoning || "Ekstre başarıyla okundu.").replace(/\n/g, '<br>');

    let html = "";
    const colIndex = currentData.expenseHeaders.indexOf(selectedCard);

    resultJson.items.forEach((item, idx) => {
        // Find existing value in currentData for this month & card
        const rowIndex = currentData.rows.findIndex(r => r.month.toLowerCase() === item.month.toLowerCase());
        let existingVal = "";
        if (rowIndex !== -1 && colIndex !== -1) {
            existingVal = currentData.rows[rowIndex].exps[colIndex] || "";
        }

        const existingLabel = existingVal ? `${formatCurrency(Number(existingVal))} mevcut` : "Boş";

        html += `
            <tr id="ai-row-${idx}">
                <td style="text-align: center;">
                    <input type="checkbox" class="ai-include-check" checked data-idx="${idx}">
                </td>
                <td>
                    <strong style="color: #ffffff;">${item.month}</strong>
                </td>
                <td>
                    <span style="color: var(--accent-cyan); font-weight: 600;">${selectedCard}</span>
                </td>
                <td>
                    <input type="number" class="ai-amount-input" value="${item.amount}" data-idx="${idx}" style="font-weight: 700;">
                </td>
                <td style="font-size: 11.5px; color: var(--text-muted);">
                    ${existingLabel}
                </td>
                <td>
                    <select class="ai-mode-select form-select" data-idx="${idx}" style="padding: 4px 8px; font-size: 12px;">
                        <option value="replace" ${!existingVal ? 'selected' : ''}>Yerine Yaz (=)</option>
                        <option value="add" ${existingVal ? 'selected' : ''}>Üzerine Ekle (+)</option>
                    </select>
                </td>
                <td style="font-size: 11.5px; color: var(--text-secondary);">
                    ${item.note || '-'}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    reviewPanel.style.display = "block";
    reviewPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// User confirms and applies AI suggestions to the main budget table
function applyAIToTable() {
    if (!aiAnalysisResults || !aiAnalysisResults.items) return;

    const cardSelect = document.getElementById("aiCardSelect");
    const selectedCard = cardSelect ? cardSelect.value : "";
    const colIndex = currentData.expenseHeaders.indexOf(selectedCard);

    if (colIndex === -1) {
        alert(`"${selectedCard}" sütunu bütçe tablosunda bulunamadı.`);
        return;
    }

    const rows = document.querySelectorAll("#aiReviewTableBody tr");
    let appliedCount = 0;

    rows.forEach(tr => {
        const checkbox = tr.querySelector(".ai-include-check");
        if (checkbox && checkbox.checked) {
            const idx = checkbox.getAttribute("data-idx");
            const item = aiAnalysisResults.items[idx];
            const amountInput = tr.querySelector(".ai-amount-input");
            const modeSelect = tr.querySelector(".ai-mode-select");

            const finalAmount = Number(amountInput.value) || 0;
            const mode = modeSelect.value; // "add" or "replace"

            // Locate target row in budget
            let rowIndex = currentData.rows.findIndex(r => r.month.toLowerCase() === item.month.toLowerCase());
            
            // If month doesn't exist, create it
            if (rowIndex === -1) {
                const emptyExps = new Array(currentData.expenseHeaders.length).fill("");
                currentData.rows.push({ month: item.month, inc1: "", inc2: "", exps: emptyExps });
                rowIndex = currentData.rows.length - 1;
            }

            const currentCellVal = Number(currentData.rows[rowIndex].exps[colIndex]) || 0;
            
            if (mode === "add") {
                currentData.rows[rowIndex].exps[colIndex] = currentCellVal + finalAmount;
            } else {
                currentData.rows[rowIndex].exps[colIndex] = finalAmount;
            }

            appliedCount++;
        }
    });

    // Re-render and save
    renderTable();
    scrapeAndSave();

    showToast(`🚀 ${appliedCount} aylık ödeme başarıyla "${selectedCard}" sütununa işlendi!`, 3500);

    // Switch to table tab to show user the changes
    setTimeout(() => {
        switchTab("tab-table");
    }, 800);
}

// Cancel AI review
function cancelAIReview() {
    const reviewPanel = document.getElementById("aiReviewPanel");
    if (reviewPanel) reviewPanel.style.display = "none";
    aiAnalysisResults = null;
    showToast("İşlem iptal edildi");
}

// ==========================================================================
// GEMINI API KEY MANAGEMENT MODAL
// ==========================================================================

function openApiKeyModal() {
    const modal = document.getElementById("apiKeyModal");
    const input = document.getElementById("modalApiKeyInput");
    if (modal && input) {
        input.value = localStorage.getItem("geminiApiKey") || "";
        modal.classList.add("active");
    }
}

function closeApiKeyModal() {
    const modal = document.getElementById("apiKeyModal");
    if (modal) modal.classList.remove("active");
}

function saveApiKeyFromModal() {
    const input = document.getElementById("modalApiKeyInput");
    if (!input) return;

    const key = input.value.trim();
    if (key) {
        localStorage.setItem("geminiApiKey", key);
        updateAIStatusBadge(true);
        showToast("🔑 Gemini API Anahtarı başarıyla kaydedildi!");
        closeApiKeyModal();
    } else {
        localStorage.removeItem("geminiApiKey");
        updateAIStatusBadge(false);
        showToast("API Anahtarı silindi");
        closeApiKeyModal();
    }
}

function updateAIStatusBadge(isActive) {
    const badge = document.getElementById("aiStatusBadge");
    const dot = document.getElementById("aiStatusDot");
    if (badge && dot) {
        if (isActive) {
            badge.innerHTML = `<span class="badge-dot dot-ai" id="aiStatusDot"></span> Gemini AI: Aktif`;
        } else {
            badge.innerHTML = `<span class="badge-dot dot-warning" id="aiStatusDot"></span> Gemini AI: API Key Gerekli`;
        }
    }
}

// Initialize on DOM load
window.addEventListener("DOMContentLoaded", () => {
    updateAICardOptions();
    setupAIUploadListeners();
    updateAIStatusBadge(!!localStorage.getItem("geminiApiKey"));
});
