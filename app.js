/* ==========================================================================
   TITANIUM FINANCE - CORE BUDGET LOGIC & APPLICATION CONTROLLER
   ========================================================================== */

// Initial default dataset matching user's exact structure and figures
const defaultBudgetData = {
    expenseHeaders: [
        "Axess", "Wings", "Money", "Garanti", 
        "İş Bankası Batı", "İş Bankası Işıl", 
        "Yapı Kredi", "Opet", "Kira", "Market", 
        "Diğer", "Araba"
    ],
    rows: [
        { month: "Şubat", inc1: "114000", inc2: "108000", exps: ["", "", "", "", "", "", "", "", "", "", "", ""] },
        { month: "Mart", inc1: "110750", inc2: "105000", exps: ["", "", "", "", "", "", "", "", "", "", "", ""] },
        { month: "Nisan", inc1: "107900", inc2: "102000", exps: ["", "", "", "", "", "", "", "", "", "", "", ""] },
        { month: "Mayıs", inc1: "99250", inc2: "95500", exps: ["", "", "", "", "", "", "", "", "", "", "", ""] },
        { month: "Haziran", inc1: "98750", inc2: "93250", exps: ["", "", "", "", "", "", "", "", "", "", "", ""] },
        { month: "Temmuz", inc1: "98750", inc2: "93250", exps: ["", "", "", "", "", "", "", "", "", "", "", ""] },
        { month: "Ağustos", inc1: "99000", inc2: "93600", exps: ["", "", "", "", "", "", "", "", "", "", "", ""] },
        { month: "Eylül", inc1: "100150", inc2: "94725", exps: ["", "", "", "", "", "", "", "", "", "", "", ""] },
        { month: "Ekim", inc1: "100150", inc2: "94725", exps: ["", "", "", "", "", "", "", "", "", "", "", ""] },
        { month: "Kasım", inc1: "100150", inc2: "94725", exps: ["", "", "", "", "", "", "", "", "", "", "", ""] },
        { month: "Aralık", inc1: "100150", inc2: "94725", exps: ["", "", "", "", "", "", "", "", "", "", "", ""] },
        { month: "Ocak", inc1: "94600", inc2: "94725", exps: ["", "", "", "", "", "", "", "", "", "", "", ""] }
    ],
    lastUpdated: new Date().toISOString()
};

// Global state
let currentData = JSON.parse(localStorage.getItem("budgetDataTitaniumV1")) || 
                  JSON.parse(localStorage.getItem("budgetDataLightV3")) || 
                  defaultBudgetData;

// DOM References
const table = document.getElementById("financeTable");
const thead = document.getElementById("tableHead");
const tbody = document.getElementById("tableBody");

// Currency formatter
const formatCurrency = (num) => {
    if (num === 0 || isNaN(num)) return "0 ₺";
    return num.toLocaleString('tr-TR') + " ₺";
};

// ==========================================================================
// TABLE RENDERING & DRAG-AND-DROP
// ==========================================================================

function renderTable() {
    if (!thead || !tbody) return;

    let headHTML = `
        <tr>
            <th rowspan="2" class="sticky-col">Aylar</th>
            <th colspan="3" class="text-income">Gelirler (Maaş & Ek)</th>
            <th colspan="${currentData.expenseHeaders.length + 2}" class="text-expense">Giderler & Taksitler</th>
            <th rowspan="2">Kalan (Net)</th>
        </tr>
        <tr>
            <th class="text-income">
                <div class="header-content">
                    <span>Batıkan Maaş</span>
                    <span class="fill-icon" onclick="fillAll('inc1', 'Batıkan Maaş')" title="Tüm Aylara Uygula">🔽</span>
                </div>
            </th>
            <th class="text-income">
                <div class="header-content">
                    <span>Işıl Maaş</span>
                    <span class="fill-icon" onclick="fillAll('inc2', 'Işıl Maaş')" title="Tüm Aylara Uygula">🔽</span>
                </div>
            </th>
            <th class="text-income total-cell">Toplam Gelir</th>
    `;
    
    // Expense columns with Drag & Drop
    currentData.expenseHeaders.forEach((header, index) => {
        headHTML += `
            <th class="text-expense draggable-col" draggable="true" 
                ondragstart="dragStart(event, ${index})" 
                ondragover="dragOver(event)" 
                ondragenter="dragEnter(event, ${index})"
                ondragleave="dragLeave(event, ${index})"
                ondrop="drop(event, ${index})"
                id="col-head-${index}">
                <div class="header-content">
                    <span class="drag-handle" title="Tutup Sürükle ve Sırala">⣿</span>
                    <span class="delete-btn" onclick="removeCol(${index})" title="Bu Sütunu Sil">✕</span>
                    <span contenteditable="true" class="exp-header-text">${header}</span>
                    <span class="fill-icon" onclick="fillAll('exp', '${header}', ${index})" title="Tüm Aylara Uygula">🔽</span>
                </div>
            </th>
        `;
    });
    
    headHTML += `
            <th class="text-expense total-cell">Toplam Gider</th>
            <th style="width: 38px; padding: 4px;">
                <button class="add-col-btn" onclick="addCol()" title="Yeni Gider Sütunu Ekle">＋</button>
            </th>
        </tr>
    `;
    thead.innerHTML = headHTML;

    // Body rows
    let bodyHTML = "";
    currentData.rows.forEach((row, rIndex) => {
        let expensesHTML = "";
        row.exps.forEach((exp) => {
            expensesHTML += `<td><input type="number" class="exp-val" value="${exp}" placeholder="0"></td>`;
        });

        bodyHTML += `
            <tr class="data-row">
                <td class="month-cell sticky-col">
                    <span class="delete-btn" onclick="removeRow(${rIndex})" title="Bu Ayı Sil">✕</span>
                    <span contenteditable="true" class="month-name">${row.month}</span>
                </td>
                <td><input type="number" class="inc1" value="${row.inc1}" placeholder="0"></td>
                <td><input type="number" class="inc2" value="${row.inc2}" placeholder="0"></td>
                <td class="total-cell text-income row-inc-total">0 ₺</td>
                ${expensesHTML}
                <td class="total-cell text-expense row-exp-total">0 ₺</td>
                <td style="background-color: rgba(255, 255, 255, 0.02);"></td>
                <td class="total-cell row-net">0 ₺</td>
            </tr>
        `;
    });

    const totalColumns = 1 + 3 + currentData.expenseHeaders.length + 2 + 1;
    bodyHTML += `
        <tr>
            <td colspan="${totalColumns}" class="add-row-cell">
                <button class="add-row-btn" onclick="addRow()">➕ Yeni Ay Ekle</button>
            </td>
        </tr>
    `;

    tbody.innerHTML = bodyHTML;
    updateAllTotals();
    updateKPICards();

    // Notify other components (AI card selector, charts)
    if (typeof updateAICardOptions === "function") {
        updateAICardOptions();
    }
    if (typeof refreshCharts === "function") {
        refreshCharts();
    }
}

// Drag & Drop column handlers
let draggedColIndex = null;

function dragStart(e, index) {
    draggedColIndex = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
}

function dragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function dragEnter(e, index) {
    e.preventDefault();
    if (index !== draggedColIndex) {
        const el = document.getElementById(`col-head-${index}`);
        if (el) el.classList.add('drag-over');
    }
}

function dragLeave(e, index) {
    const el = document.getElementById(`col-head-${index}`);
    if (el) el.classList.remove('drag-over');
}

function drop(e, index) {
    e.stopPropagation();
    const el = document.getElementById(`col-head-${index}`);
    if (el) el.classList.remove('drag-over');
    
    if (draggedColIndex !== null && draggedColIndex !== index) {
        const movedHeader = currentData.expenseHeaders.splice(draggedColIndex, 1)[0];
        currentData.expenseHeaders.splice(index, 0, movedHeader);
        
        currentData.rows.forEach(row => {
            const movedExp = row.exps.splice(draggedColIndex, 1)[0];
            row.exps.splice(index, 0, movedExp);
        });
        
        renderTable();
        scrapeAndSave();
        showToast("Sütun sırası güncellendi");
    }
    draggedColIndex = null;
    return false;
}

// Fill all rows in a column
function fillAll(type, headerName, colIndex = -1) {
    const val = prompt(`Tüm aylar için "${headerName}" sütununa yazılacak ortak değeri girin:\n(Örn: 25000)`, "");
    
    if (val !== null && val.trim() !== "") {
        const numVal = Number(val);
        if (!isNaN(numVal)) {
            currentData.rows.forEach(row => {
                if (type === 'inc1') row.inc1 = numVal;
                else if (type === 'inc2') row.inc2 = numVal;
                else if (type === 'exp') row.exps[colIndex] = numVal;
            });
            renderTable();
            scrapeAndSave();
            showToast(`✅ "${headerName}" tüm aylara uygulandı!`);
        } else {
            alert("Lütfen geçerli bir sayı girin.");
        }
    }
}

// Save current DOM state into currentData and localStorage
function scrapeAndSave(silent = false) {
    const headerSpans = document.querySelectorAll('.exp-header-text');
    if (headerSpans.length > 0) {
        currentData.expenseHeaders = Array.from(headerSpans).map(span => span.innerText.trim());
    }

    const trs = tbody.querySelectorAll('tr.data-row');
    if (trs.length > 0) {
        currentData.rows = Array.from(trs).map(tr => {
            return {
                month: tr.querySelector('.month-name').innerText.trim(),
                inc1: tr.querySelector('.inc1').value,
                inc2: tr.querySelector('.inc2').value,
                exps: Array.from(tr.querySelectorAll('.exp-val')).map(inp => inp.value)
            };
        });
    }

    currentData.lastUpdated = new Date().toISOString();
    localStorage.setItem("budgetDataTitaniumV1", JSON.stringify(currentData));
    updateLastSyncBadge("Yerel Kaydedildi (" + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) + ")");

    // Trigger auto-sync if enabled
    if (typeof autoSyncToCloud === "function") {
        autoSyncToCloud();
    }

    if (!silent) {
        updateKPICards();
        if (typeof refreshCharts === "function") refreshCharts();
    }
}

// Row calculation
function calculateRow(tr) {
    const inc1 = Number(tr.querySelector('.inc1').value) || 0;
    const inc2 = Number(tr.querySelector('.inc2').value) || 0;
    const totalInc = inc1 + inc2;
    
    let totalExp = 0;
    tr.querySelectorAll('.exp-val').forEach(inp => {
        totalExp += Math.abs(Number(inp.value)) || 0;
    });

    const net = totalInc - totalExp;

    tr.querySelector('.row-inc-total').textContent = formatCurrency(totalInc);
    tr.querySelector('.row-exp-total').textContent = formatCurrency(totalExp);
    
    const netCell = tr.querySelector('.row-net');
    netCell.textContent = formatCurrency(net);
    
    if (net > 0) {
        netCell.style.color = "var(--income-color)";
        netCell.style.textShadow = "0 0 10px rgba(16, 185, 129, 0.3)";
    } else if (net < 0) {
        netCell.style.color = "var(--expense-color)";
        netCell.style.textShadow = "0 0 10px rgba(244, 63, 94, 0.3)";
    } else {
        netCell.style.color = "var(--text-secondary)";
        netCell.style.textShadow = "none";
    }
}

function updateAllTotals() {
    tbody.querySelectorAll('tr.data-row').forEach(tr => calculateRow(tr));
}

// Event Listeners for Table
table.addEventListener('input', (e) => {
    if (e.target.tagName === 'INPUT') {
        calculateRow(e.target.closest('tr'));
        updateKPICards();
    }
    scrapeAndSave(true);
});

table.addEventListener('keydown', (e) => {
    if (e.target.hasAttribute('contenteditable') && e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
        scrapeAndSave();
    }
});

table.addEventListener('focusout', (e) => {
    if (e.target.hasAttribute('contenteditable')) {
        scrapeAndSave();
        renderTable(); 
    }
});

// Row & Column Operations
function addRow() {
    scrapeAndSave(); 
    const emptyExps = new Array(currentData.expenseHeaders.length).fill("");
    const nextMonthName = getNextMonthName(currentData.rows.length);
    currentData.rows.push({ month: nextMonthName, inc1: "", inc2: "", exps: emptyExps });
    renderTable();
    scrapeAndSave();
    showToast(`✅ "${nextMonthName}" ayı eklendi`);
}

function getNextMonthName(currentIndex) {
    const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    return months[currentIndex % 12] || `Ay ${currentIndex + 1}`;
}

function removeRow(index) {
    const rowName = currentData.rows[index]?.month || "Bu";
    if (confirm(`"${rowName}" satırını silmek istediğinize emin misiniz?`)) {
        currentData.rows.splice(index, 1);
        renderTable();
        scrapeAndSave();
        showToast(`🗑️ "${rowName}" silindi`);
    }
}

function addCol() {
    scrapeAndSave();
    const newName = prompt("Yeni Gider / Kart Adını Girin:", "Yeni Gider");
    if (!newName || newName.trim() === "") return;
    
    currentData.expenseHeaders.push(newName.trim());
    currentData.rows.forEach(row => row.exps.push(""));
    renderTable();
    scrapeAndSave();
    showToast(`✅ "${newName}" sütunu eklendi`);
}

function removeCol(index) {
    const headerName = currentData.expenseHeaders[index];
    if (confirm(`"${headerName}" sütununu ve bu sütundaki tüm verileri silmek istediğinize emin misiniz?`)) {
        currentData.expenseHeaders.splice(index, 1);
        currentData.rows.forEach(row => row.exps.splice(index, 1));
        renderTable();
        scrapeAndSave();
        showToast(`🗑️ "${headerName}" sütunu silindi`);
    }
}

function manualSave() {
    scrapeAndSave();
    showToast("💾 Tüm veriler tarayıcıya güvenle kaydedildi!");
}

// ==========================================================================
// EXECUTIVE KPI DASHBOARD
// ==========================================================================

function updateKPICards() {
    let totalAnnualIncome = 0;
    let totalAnnualExpense = 0;
    let maxExpenseMonth = { name: "-", amount: 0 };

    currentData.rows.forEach(row => {
        const inc = (Number(row.inc1) || 0) + (Number(row.inc2) || 0);
        let exp = 0;
        row.exps.forEach(v => exp += (Number(v) || 0));

        totalAnnualIncome += inc;
        totalAnnualExpense += exp;

        if (exp > maxExpenseMonth.amount) {
            maxExpenseMonth = { name: row.month, amount: exp };
        }
    });

    const netAnnual = totalAnnualIncome - totalAnnualExpense;
    const savingsRate = totalAnnualIncome > 0 ? ((netAnnual / totalAnnualIncome) * 100).toFixed(1) : 0;

    const elAnnualIncome = document.getElementById("kpiTotalIncome");
    const elAnnualExpense = document.getElementById("kpiTotalExpense");
    const elAnnualNet = document.getElementById("kpiTotalNet");
    const elSavingsRate = document.getElementById("kpiSavingsRate");

    if (elAnnualIncome) elAnnualIncome.textContent = formatCurrency(totalAnnualIncome);
    if (elAnnualExpense) elAnnualExpense.textContent = formatCurrency(totalAnnualExpense);
    if (elAnnualNet) {
        elAnnualNet.textContent = formatCurrency(netAnnual);
        elAnnualNet.style.color = netAnnual >= 0 ? "var(--income-color)" : "var(--expense-color)";
    }
    if (elSavingsRate) {
        elSavingsRate.textContent = `%${savingsRate} (${maxExpenseMonth.name})`;
    }
}

// ==========================================================================
// BACKUP / EXPORT / IMPORT
// ==========================================================================

function exportData() {
    scrapeAndSave(); 
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentData, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    const dateStr = new Date().toISOString().slice(0, 10);
    dlAnchorElem.setAttribute("download", `butce_yedek_${dateStr}.json`);
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    dlAnchorElem.remove();
    showToast("⬇️ Bütçe yedeği indirildi");
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (importedData.expenseHeaders && Array.isArray(importedData.rows)) {
                currentData = importedData;
                renderTable();
                scrapeAndSave();
                showToast("✅ Yedek başarıyla yüklendi!");
            } else {
                alert("Hata: Dosya geçerli bir bütçe formatında değil.");
            }
        } catch (err) {
            alert("Dosya okunamadı: " + err.message);
        }
        document.getElementById('importFile').value = ""; 
    };
    reader.readAsText(file);
}

// ==========================================================================
// TABS NAVIGATION CONTROLLER
// ==========================================================================

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    document.querySelectorAll('.tab-content-panel').forEach(panel => {
        panel.style.display = panel.id === tabId ? 'block' : 'none';
    });

    if (tabId === 'tab-charts' && typeof refreshCharts === "function") {
        setTimeout(refreshCharts, 50);
    }
}

// Toast notification
function showToast(message, duration = 2400) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.innerHTML = message;
    toast.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.remove("show");
    }, duration);
}

function updateLastSyncBadge(text) {
    const badge = document.getElementById("lastSyncBadge");
    if (badge) badge.textContent = text;
}

// Initialize on DOM load
window.addEventListener("DOMContentLoaded", () => {
    renderTable();
});
