// =============================================
// ADMIN — admin.js  (YouTube + Dosya destekli)
// =============================================

let _adminTracks = [];
let _kaynak = "yt"; // 'yt' veya 'dosya'
let selectedFile = null;

document.addEventListener("DOMContentLoaded", () => {
  setupLogin();
  setupForm();
  setupDragDrop();
  setupEditModal();
  setupYtPreview();
});

// ---- Login ----
function setupLogin() {
  const loginWrap = document.getElementById("login-wrap");
  const adminApp = document.getElementById("admin-app");
  const passInput = document.getElementById("admin-pass");
  const loginBtn = document.getElementById("login-btn");
  const loginErr = document.getElementById("login-err");

  if (sessionStorage.getItem("admin_auth") === "1") {
    loginWrap.classList.add("hidden");
    adminApp.classList.remove("hidden");
    loadAdminTracks();
  }

  function tryLogin() {
    if (passInput.value === ADMIN_PASSWORD) {
      sessionStorage.setItem("admin_auth", "1");
      loginWrap.classList.add("hidden");
      adminApp.classList.remove("hidden");
      loadAdminTracks();
    } else {
      loginErr.textContent = "Şifre hatalı.";
      passInput.classList.add("err");
      setTimeout(() => passInput.classList.remove("err"), 600);
    }
  }

  loginBtn.addEventListener("click", tryLogin);
  passInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryLogin();
  });
}

// ---- Kaynak seçimi ----
function kaynakSec(tip) {
  _kaynak = tip;
  document.getElementById("kaynak-yt").classList.toggle("aktif", tip === "yt");
  document
    .getElementById("kaynak-dosya")
    .classList.toggle("aktif", tip === "dosya");
  document.getElementById("alan-yt").classList.toggle("hidden", tip !== "yt");
  document
    .getElementById("alan-dosya")
    .classList.toggle("hidden", tip !== "dosya");
}

// ---- YouTube URL önizleme ----
function setupYtPreview() {
  const ytInput = document.getElementById("track-yt-url");
  const ytPreview = document.getElementById("yt-preview");

  let timer;
  ytInput.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const vid = ytVideoId(ytInput.value.trim());
      if (vid) {
        ytPreview.innerHTML = `<iframe src="https://www.youtube.com/embed/${vid}" allowfullscreen></iframe>`;
        ytPreview.classList.add("goster");
      } else {
        ytPreview.innerHTML = "";
        ytPreview.classList.remove("goster");
      }
    }, 600);
  });
}

function ytVideoId(url) {
  if (!url) return null;
  // Direkt ID (11 karakter)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
  } catch {
    return null;
  }
  return null;
}

// ---- Form setup ----
function setupForm() {
  const form = document.getElementById("upload-form");
  const fileInput = document.getElementById("file-input");
  const fileDisp = document.getElementById("file-name-display");

  fileInput.addEventListener("change", () => {
    selectedFile = fileInput.files[0] || null;
    fileDisp.textContent = selectedFile ? selectedFile.name : "";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await uploadTrack();
  });
}

function setupDragDrop() {
  const drop = document.getElementById("file-drop");
  ["dragenter", "dragover"].forEach((ev) => {
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach((ev) => {
    drop.addEventListener(ev, () => drop.classList.remove("dragover"));
  });
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("audio/")) {
      selectedFile = file;
      document.getElementById("file-name-display").textContent = file.name;
    }
  });
}

// ---- Upload ----
async function uploadTrack() {
  const title = document.getElementById("track-title").value.trim();
  const artist = document.getElementById("track-artist").value.trim();
  const lyrics = document.getElementById("track-lyrics").value.trim();

  if (!title || !artist) {
    showToast("Parça adı ve sanatçı zorunludur.", "error");
    return;
  }

  const btn = document.getElementById("submit-btn");
  const progWrap = document.getElementById("upload-progress");
  const progFill = document.getElementById("upload-bar-fill");
  const progStatus = document.getElementById("upload-status");

  btn.disabled = true;
  progWrap.classList.remove("hidden");

  try {
    let fileUrl = null;
    let youtubeUrl = null;

    if (_kaynak === "yt") {
      // YouTube modu
      const ytRaw = document.getElementById("track-yt-url").value.trim();
      const vid = ytVideoId(ytRaw);
      if (!vid) {
        showToast("Geçerli bir YouTube URL'si girin.", "error");
        btn.disabled = false;
        progWrap.classList.add("hidden");
        return;
      }
      youtubeUrl = `https://www.youtube.com/watch?v=${vid}`;
      progFill.style.width = "60%";
      progStatus.textContent = "Kaydediliyor...";
    } else {
      // Dosya modu
      if (!selectedFile) {
        showToast("Dosya seçin.", "error");
        btn.disabled = false;
        progWrap.classList.add("hidden");
        return;
      }

      progFill.style.width = "10%";
      progStatus.textContent = "Dosya yükleniyor...";

      const ext = selectedFile.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: storageErr } = await db.storage
        .from("music")
        .upload(fileName, selectedFile, { contentType: selectedFile.type });

      if (storageErr) throw storageErr;

      progFill.style.width = "65%";
      progStatus.textContent = "Kaydediliyor...";

      const { data: urlData } = db.storage.from("music").getPublicUrl(fileName);
      fileUrl = urlData.publicUrl;
    }

    // DB insert
    const { error: dbErr } = await db.from("tracks").insert([
      {
        title,
        artist,
        lyrics: lyrics || null,
        file_url: fileUrl,
        youtube_url: youtubeUrl,
      },
    ]);

    if (dbErr) throw dbErr;

    progFill.style.width = "100%";
    progStatus.textContent = "Tamamlandı!";
    showToast("Parça eklendi.", "success");
    resetForm();
    setTimeout(() => {
      progWrap.classList.add("hidden");
      progFill.style.width = "0%";
    }, 1500);
    loadAdminTracks();
  } catch (err) {
    console.error(err);
    showToast("Hata: " + (err.message || "Yükleme başarısız."), "error");
    progWrap.classList.add("hidden");
  } finally {
    btn.disabled = false;
  }
}

function resetForm() {
  document.getElementById("track-title").value = "";
  document.getElementById("track-artist").value = "";
  document.getElementById("track-lyrics").value = "";
  document.getElementById("track-yt-url").value = "";
  document.getElementById("file-input").value = "";
  document.getElementById("file-name-display").textContent = "";
  document.getElementById("yt-preview").innerHTML = "";
  document.getElementById("yt-preview").classList.remove("goster");
  selectedFile = null;
}

// ---- Track list ----
async function loadAdminTracks() {
  const container = document.getElementById("admin-tracklist");
  container.innerHTML =
    '<div class="loading"><div class="spinner"></div>Yükleniyor…</div>';

  try {
    const { data, error } = await db
      .from("tracks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    _adminTracks = data || [];

    if (_adminTracks.length === 0) {
      container.innerHTML =
        '<p style="color:var(--text-muted);font-size:.85rem;padding:16px 0">Henüz parça yok.</p>';
      return;
    }

    container.innerHTML = _adminTracks
      .map(
        (t) => `
      <div class="track-admin-row" id="row-${t.id}">
        <div class="row-info">
          <div class="row-title">
            ${escHtml(t.title)}
            ${t.youtube_url ? '<span class="yt-badge">YT</span>' : ""}
          </div>
          <div class="row-artist">${escHtml(t.artist)}
            ${t.lyrics ? '&nbsp;&middot;&nbsp;<span class="row-has-lyrics">Lirik var</span>' : ""}
          </div>
        </div>
        <div class="row-date">${new Date(t.created_at).toLocaleDateString("tr-TR")}</div>
        <div style="display:flex;gap:8px;flex-shrink:0">
          <button class="btn btn-edit" onclick="openEditModal('${t.id}')">Düzenle</button>
          <button class="btn btn-danger" onclick="deleteTrack('${t.id}', '${escAttr(t.file_url || "")}', ${!!t.youtube_url})">Sil</button>
        </div>
      </div>
    `,
      )
      .join("");
  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger);font-size:.85rem">Yüklenemedi: ${err.message}</p>`;
  }
}

// ---- Edit Modal ----
function setupEditModal() {
  const overlay = document.getElementById("edit-modal-overlay");
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeEditModal();
  });
  document
    .getElementById("edit-cancel-btn")
    .addEventListener("click", closeEditModal);
  document.getElementById("edit-save-btn").addEventListener("click", saveEdit);
}

function openEditModal(id) {
  const track = _adminTracks.find((t) => t.id === id);
  if (!track) return;

  document.getElementById("edit-id").value = track.id;
  document.getElementById("edit-title").value = track.title;
  document.getElementById("edit-artist").value = track.artist;
  document.getElementById("edit-lyrics").value = track.lyrics || "";
  document.getElementById("edit-modal-overlay").classList.remove("hidden");
}

function closeEditModal() {
  document.getElementById("edit-modal-overlay").classList.add("hidden");
}

async function saveEdit() {
  const id = document.getElementById("edit-id").value;
  const title = document.getElementById("edit-title").value.trim();
  const artist = document.getElementById("edit-artist").value.trim();
  const lyrics = document.getElementById("edit-lyrics").value.trim();

  if (!title || !artist) {
    showToast("Parça adı ve sanatçı boş olamaz.", "error");
    return;
  }

  const saveBtn = document.getElementById("edit-save-btn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Kaydediliyor...";

  try {
    const { error } = await db
      .from("tracks")
      .update({
        title,
        artist,
        lyrics: lyrics || null,
      })
      .eq("id", id);

    if (error) throw error;
    showToast("Güncellendi.", "success");
    closeEditModal();
    loadAdminTracks();
  } catch (err) {
    showToast("Güncellenemedi: " + err.message, "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Kaydet";
  }
}

// ---- Delete ----
async function deleteTrack(id, fileUrl, isYt) {
  if (!confirm("Silmek istediğinizden emin misiniz?")) return;

  try {
    const { error: dbErr } = await db.from("tracks").delete().eq("id", id);
    if (dbErr) throw dbErr;

    // Sadece dosya yüklendiyse storage'dan sil
    if (!isYt && fileUrl) {
      const fileName = fileUrl.split("/").pop();
      await db.storage.from("music").remove([fileName]);
    }

    document.getElementById(`row-${id}`)?.remove();
    showToast("Parça silindi.", "success");
  } catch (err) {
    showToast("Silinemedi: " + err.message, "error");
  }
}

// ---- Toast ----
function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove("show"), 3200);
}

// ---- Helpers ----
function escHtml(s) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function escAttr(s) {
  return (s || "").replace(/'/g, "\\'");
}
