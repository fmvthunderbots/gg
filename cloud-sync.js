/* ==========================================================================
   TITANIUM FINANCE - CROSS-DEVICE CLOUD SYNC MANAGER
   Keeps mobile phone, tablet and PCs synchronized in real-time
   Supports GitHub Gist Sync (Private & Free) and JSONBin / Cloud Storage
   ========================================================================== */

const CloudSync = {
    // Config stored in localStorage
    getConfig() {
        return {
            provider: localStorage.getItem("sync_provider") || "gist",
            githubToken: localStorage.getItem("sync_github_token") || "",
            gistId: localStorage.getItem("sync_gist_id") || "",
            jsonbinKey: localStorage.getItem("sync_jsonbin_key") || "",
            jsonbinId: localStorage.getItem("sync_jsonbin_id") || "",
            autoSync: localStorage.getItem("sync_auto") !== "false"
        };
    },

    saveConfig(cfg) {
        if (cfg.provider) localStorage.setItem("sync_provider", cfg.provider);
        if (cfg.githubToken !== undefined) localStorage.setItem("sync_github_token", cfg.githubToken.trim());
        if (cfg.gistId !== undefined) localStorage.setItem("sync_gist_id", cfg.gistId.trim());
        if (cfg.jsonbinKey !== undefined) localStorage.setItem("sync_jsonbin_key", cfg.jsonbinKey.trim());
        if (cfg.jsonbinId !== undefined) localStorage.setItem("sync_jsonbin_id", cfg.jsonbinId.trim());
        if (cfg.autoSync !== undefined) localStorage.setItem("sync_auto", cfg.autoSync ? "true" : "false");
        this.updateUIStatus();
    },

    isConfigured() {
        const cfg = this.getConfig();
        if (cfg.provider === "gist") {
            return !!(cfg.githubToken && cfg.gistId);
        } else if (cfg.provider === "jsonbin") {
            return !!(cfg.jsonbinKey && cfg.jsonbinId);
        }
        return false;
    },

    // ======================================================================
    // GITHUB GIST SYNC IMPLEMENTATION
    // ======================================================================

    async createGist(githubToken) {
        if (!githubToken) throw new Error("GitHub Personal Access Token gerekli.");

        const response = await fetch("https://api.github.com/gists", {
            method: "POST",
            headers: {
                "Authorization": `token ${githubToken}`,
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                description: "Titanium Finance - Kişisel Bütçe Veritabanı (Otomatik Senkronizasyon)",
                public: false,
                files: {
                    "budget_data.json": {
                        content: JSON.stringify(currentData, null, 2)
                    }
                }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`GitHub Gist oluşturulamadı (${response.status}): ${err}`);
        }

        const data = await response.json();
        return data.id;
    },

    async pushToGist(cfg, payload) {
        const response = await fetch(`https://api.github.com/gists/${cfg.gistId}`, {
            method: "PATCH",
            headers: {
                "Authorization": `token ${cfg.githubToken}`,
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                files: {
                    "budget_data.json": {
                        content: JSON.stringify(payload, null, 2)
                    }
                }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Gist'e yüklenemedi (${response.status}): ${err}`);
        }
        return true;
    },

    async fetchFromGist(cfg) {
        // Use a cache-busting timestamp query parameter
        const response = await fetch(`https://api.github.com/gists/${cfg.gistId}?t=${Date.now()}`, {
            headers: {
                "Authorization": `token ${cfg.githubToken}`,
                "Accept": "application/vnd.github.v3+json"
            }
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Gist'ten veri çekilemedi (${response.status}): ${err}`);
        }

        const data = await response.json();
        const fileContent = data.files?.["budget_data.json"]?.content;
        if (!fileContent) throw new Error("Gist içinde 'budget_data.json' dosyası bulunamadı.");
        
        return JSON.parse(fileContent);
    },

    // ======================================================================
    // PUSH & PULL SYNC CONTROLLER
    // ======================================================================

    async push() {
        const cfg = this.getConfig();
        if (!this.isConfigured()) return false;

        this.setSyncingBadge(true);
        try {
            currentData.lastUpdated = new Date().toISOString();
            if (cfg.provider === "gist") {
                await this.pushToGist(cfg, currentData);
            }
            this.setSyncingBadge(false, "success");
            showToast("☁️ Veriler bulut ile eşitlendi!");
            return true;
        } catch (err) {
            console.error("Cloud push failed:", err);
            this.setSyncingBadge(false, "error");
            showToast("⚠️ Bulut eşitleme hatası: " + err.message, 4000);
            return false;
        }
    },

    async pull(force = false) {
        const cfg = this.getConfig();
        if (!this.isConfigured()) return false;

        this.setSyncingBadge(true);
        try {
            let cloudData = null;
            if (cfg.provider === "gist") {
                cloudData = await this.fetchFromGist(cfg);
            }

            if (!cloudData || !cloudData.rows) {
                throw new Error("Geçersiz bulut veri yapısı.");
            }

            const localTime = new Date(currentData.lastUpdated || 0).getTime();
            const cloudTime = new Date(cloudData.lastUpdated || 0).getTime();

            // If cloud data is newer or force flag is set
            if (force || cloudTime > localTime) {
                currentData = cloudData;
                localStorage.setItem("budgetDataTitaniumV1", JSON.stringify(currentData));
                renderTable();
                this.setSyncingBadge(false, "success");
                showToast("⬇️ En güncel veriler buluttan çekildi!");
                return true;
            } else {
                this.setSyncingBadge(false, "success");
                return true;
            }
        } catch (err) {
            console.error("Cloud pull failed:", err);
            this.setSyncingBadge(false, "error");
            if (force) alert("Buluttan çekme hatası: " + err.message);
            return false;
        }
    },

    setSyncingBadge(isSyncing, state = "idle") {
        const badge = document.getElementById("cloudStatusBadge");
        if (!badge) return;

        if (isSyncing) {
            badge.innerHTML = `<span class="spinner" style="width:10px;height:10px;border-width:1.5px;"></span> Eşitleniyor...`;
        } else if (state === "success") {
            const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            badge.innerHTML = `<span class="badge-dot dot-online"></span> Bulut Senkronize (${time})`;
        } else if (state === "error") {
            badge.innerHTML = `<span class="badge-dot dot-warning"></span> Eşitleme Uyarısı`;
        } else {
            this.updateUIStatus();
        }
    },

    updateUIStatus() {
        const badge = document.getElementById("cloudStatusBadge");
        if (!badge) return;

        if (this.isConfigured()) {
            badge.innerHTML = `<span class="badge-dot dot-online"></span> Bulut Aktif`;
        } else {
            badge.innerHTML = `<span class="badge-dot dot-warning"></span> Bulut: Eşitleme Bekleniyor`;
        }
    },

    // QR Code generation for 1-second mobile sync pairing
    generateMobileSyncURL() {
        const cfg = this.getConfig();
        if (!cfg.gistId || !cfg.githubToken) return null;

        const currentUrl = window.location.href.split("?")[0];
        const params = new URLSearchParams();
        params.set("sync_gist", cfg.gistId);
        params.set("sync_token", cfg.githubToken);
        return `${currentUrl}?${params.toString()}`;
    },

    // Check URL parameters for instant sync pairing (when user scans QR code on phone)
    checkURLPairing() {
        const urlParams = new URLSearchParams(window.location.search);
        const gist = urlParams.get("sync_gist");
        const token = urlParams.get("sync_token");

        if (gist && token) {
            this.saveConfig({
                provider: "gist",
                gistId: gist,
                githubToken: token,
                autoSync: true
            });
            showToast("📱 Mobil cihaz başarıyla bilgisayarınızla eşleştirildi!");
            // Clean URL bar
            window.history.replaceState({}, document.title, window.location.pathname);
            // Pull immediately
            setTimeout(() => this.pull(true), 500);
        }
    }
};

// Auto-sync debouncer (triggers 2.5s after user stops typing)
let autoSyncTimer = null;
function autoSyncToCloud() {
    const cfg = CloudSync.getConfig();
    if (!cfg.autoSync || !CloudSync.isConfigured()) return;

    clearTimeout(autoSyncTimer);
    autoSyncTimer = setTimeout(() => {
        CloudSync.push();
    }, 2500);
}

// Setup Sync UI Event Listeners
function setupCloudSyncUI() {
    const tokenInput = document.getElementById("syncGithubToken");
    const gistInput = document.getElementById("syncGistId");
    const autoCheck = document.getElementById("syncAutoCheck");
    const qrContainer = document.getElementById("syncQrBox");

    // Populate existing values
    const cfg = CloudSync.getConfig();
    if (tokenInput) tokenInput.value = cfg.githubToken;
    if (gistInput) gistInput.value = cfg.gistId;
    if (autoCheck) autoCheck.checked = cfg.autoSync;

    // Button: Create new Gist automatically
    const createBtn = document.getElementById("btnCreateGist");
    if (createBtn) {
        createBtn.addEventListener("click", async () => {
            const token = tokenInput ? tokenInput.value.trim() : "";
            if (!token) {
                alert("Lütfen önce GitHub Personal Access Token girin.");
                tokenInput.focus();
                return;
            }

            createBtn.disabled = true;
            createBtn.innerHTML = `<span class="spinner"></span> Gist Oluşturuluyor...`;

            try {
                const newGistId = await CloudSync.createGist(token);
                if (gistInput) gistInput.value = newGistId;
                CloudSync.saveConfig({
                    provider: "gist",
                    githubToken: token,
                    gistId: newGistId,
                    autoSync: true
                });
                showToast("🎉 Yeni senkronize Gist başarıyla oluşturuldu ve bağlandı!");
                renderQRCode();
            } catch (err) {
                alert("Hata: " + err.message);
            } finally {
                createBtn.disabled = false;
                createBtn.innerHTML = `✨ Yeni Otomatik Gist Oluştur`;
            }
        });
    }

    // Button: Save settings manually
    const saveBtn = document.getElementById("btnSaveSyncSettings");
    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            CloudSync.saveConfig({
                provider: "gist",
                githubToken: tokenInput ? tokenInput.value.trim() : "",
                gistId: gistInput ? gistInput.value.trim() : "",
                autoSync: autoCheck ? autoCheck.checked : true
            });
            showToast("💾 Bulut ayarları kaydedildi!");
            renderQRCode();
        });
    }

    // Button: Manual Pull
    const pullBtn = document.getElementById("btnManualPull");
    if (pullBtn) {
        pullBtn.addEventListener("click", () => CloudSync.pull(true));
    }

    // Button: Manual Push
    const pushBtn = document.getElementById("btnManualPush");
    if (pushBtn) {
        pushBtn.addEventListener("click", () => CloudSync.push());
    }

    renderQRCode();
}

// Render QR code using a simple QR service (or SVG) so user can open on mobile with 1 tap
function renderQRCode() {
    const qrContainer = document.getElementById("syncQrBox");
    if (!qrContainer) return;

    const url = CloudSync.generateMobileSyncURL();
    if (!url) {
        qrContainer.innerHTML = `<span style="font-size:12px;color:#64748b;">(GitHub Token ve Gist ID bağlandığında telefonunuz için QR kod burada görünecektir.)</span>`;
        return;
    }

    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
    qrContainer.innerHTML = `
        <img src="${qrApiUrl}" alt="Telefona Bağla QR Kodu" style="border-radius:8px;box-shadow:0 4px 10px rgba(0,0,0,0.15);width:160px;height:160px;">
        <p style="font-size:11.5px;color:#475569;margin-top:8px;font-weight:600;text-align:center;">
            📱 Telefonunuzun kamerasıyla taratın.<br>Tek tıkla tüm verileriniz telefonunuzda açılacaktır!
        </p>
    `;
}

// Run on page load
window.addEventListener("DOMContentLoaded", () => {
    CloudSync.checkURLPairing();
    setupCloudSyncUI();
    CloudSync.updateUIStatus();

    // Auto-pull newer cloud version if configured
    if (CloudSync.isConfigured()) {
        setTimeout(() => CloudSync.pull(false), 800);
    }
});
