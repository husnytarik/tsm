// =============================================
// TÜRK SANAT MUSİKİSİ PLAYER — main.js
// YouTube IFrame API + Dosya karma destek
// =============================================

document.addEventListener("DOMContentLoaded", () => {
  loadTracks();
  setupVolume();
});

// ---- State ----
let tracks = [];
let currentIdx = -1;
let isPlaying = false;
let lyricsOpen = false;
let ytPlayer = null;
let ytReady = false;
let ytPending = null;
let playId = 0; // Her selectTrack'te artar, eski async işlemler iptal olur

const audio = new Audio();
audio.preload = "metadata";
audio.volume = 0.8;

const ROMEN = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
  "XIV",
  "XV",
  "XVI",
  "XVII",
  "XVIII",
  "XIX",
  "XX",
];

// ---- DOM ----
const elParcaNo = document.getElementById("parca-no");
const elEtiket = document.getElementById("simdi-etiketi");
const elDurumYazi = document.getElementById("durum-yazi");
const elParcaAdi = document.getElementById("parca-adi");
const elSanatci = document.getElementById("sanatci-adi");
const elDolu = document.getElementById("ilerleme-dolu");
const elSimdiki = document.getElementById("sure-simdiki");
const elToplam = document.getElementById("sure-toplam");
const elMakam = document.getElementById("makam-bar");
const elLirikPanel = document.getElementById("lirik-panel");
const elLirikMetin = document.getElementById("lirik-metin");
const elLirikBtn = document.getElementById("k-lirik");
const elPlaylist = document.getElementById("playlist-liste");
const elSayi = document.getElementById("parca-sayi");
const elOynatIkon = document.getElementById("oynat-ikon");
const elSesSlider = document.getElementById("ses-slider");
const elSesDeger = document.getElementById("ses-deger");
const elSesIkon = document.getElementById("ses-ikon");

// ---- YouTube IFrame API yükle ----
function loadYouTubeAPI() {
  if (window.YT) return;
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
}

window.onYouTubeIframeAPIReady = function () {
  ytPlayer = new YT.Player("yt-player", {
    height: "1",
    width: "1",
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      rel: 0,
    },
    events: {
      onReady: onYtReady,
      onStateChange: onYtState,
      onError: (e) => console.warn("YT Error:", e.data),
    },
  });
};

function onYtReady() {
  ytReady = true;
  if (ytPending) {
    loadYtTrack(ytPending.idx, ytPending.play, ytPending.myId);
    ytPending = null;
  }
}

function onYtState(e) {
  if (e.data === YT.PlayerState.PLAYING) {
    setPlaying(true);
    startYtProgress();
  } else if (e.data === YT.PlayerState.PAUSED) {
    setPlaying(false);
  } else if (e.data === YT.PlayerState.ENDED) {
    nextTrack();
  }
}

let ytProgressTimer = null;

function startYtProgress() {
  clearInterval(ytProgressTimer);
  ytProgressTimer = setInterval(() => {
    if (!ytPlayer || typeof ytPlayer.getCurrentTime !== "function") return;
    const cur = ytPlayer.getCurrentTime() || 0;
    const dur = ytPlayer.getDuration() || 0;
    if (dur > 0) elDolu.style.width = (cur / dur) * 100 + "%";
    elSimdiki.textContent = fmt(cur);
    elToplam.textContent = fmt(dur);
  }, 500);
}

function stopYtProgress() {
  clearInterval(ytProgressTimer);
}

// ---- Load tracks ----
async function loadTracks() {
  loadYouTubeAPI();
  try {
    const { data, error } = await db
      .from("tracks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    tracks = data || [];
    elSayi.textContent = `${tracks.length} eser`;
    renderPlaylist();
    if (tracks.length > 0) selectTrack(0, false);
  } catch (err) {
    elPlaylist.innerHTML = `<div class="durum-mesaj">Hata: ${err.message}</div>`;
  }
}

// ---- Render playlist ----
function renderPlaylist() {
  if (tracks.length === 0) {
    elPlaylist.innerHTML = `<div class="durum-mesaj">Fasılda eser bulunmuyor.</div>`;
    return;
  }

  elPlaylist.innerHTML = tracks
    .map(
      (t, i) => `
    <div class="p-satir ${i === currentIdx ? "aktif" : ""} ${i === currentIdx && isPlaying ? "calıyor" : ""}"
         data-i="${i}" onclick="selectTrack(${i}, true)">
      <div class="p-no">
        <span class="p-no-val">${String(i + 1).padStart(2, "0")}</span>
        <div class="p-mini-dalga"><span></span><span></span><span></span></div>
      </div>
      <div class="p-govde">
        <div class="p-adi">${escHtml(t.title)}${t.youtube_url ? ' <span style="font-size:.6rem;opacity:.5;font-style:normal">▶ YT</span>' : ""}</div>
        <div class="p-sanatci">${escHtml(t.artist)}</div>
      </div>
      <div class="p-sure" id="psure-${i}">—:——</div>
    </div>
  `,
    )
    .join("");

  // Süreleri yükle (sadece dosya olanlar)
  tracks.forEach((t, i) => {
    if (t.file_url && !t.youtube_url) {
      const a = new Audio();
      a.preload = "metadata";
      a.src = t.file_url;
      a.onloadedmetadata = () => {
        const el = document.getElementById(`psure-${i}`);
        if (el) el.textContent = fmt(a.duration);
      };
    }
  });
}

// ---- Select track ----
function selectTrack(idx, play = true) {
  if (idx < 0 || idx >= tracks.length) return;

  // Her seçimde yeni ID — eski setTimeout'lar bu ID'yi kontrol edip iptal olur
  playId++;
  const myId = playId;

  // Her iki kaynağı da durdur
  audio.pause();
  audio.src = "";
  stopYtProgress();
  if (ytPlayer && typeof ytPlayer.stopVideo === "function") {
    try {
      ytPlayer.stopVideo();
    } catch (e) {}
  }

  currentIdx = idx;
  const t = tracks[idx];

  elParcaAdi.textContent = t.title;
  elSanatci.textContent = t.artist;
  elParcaNo.textContent = ROMEN[idx] || (idx + 1).toString();
  elLirikMetin.textContent =
    t.lyrics && t.lyrics.trim()
      ? t.lyrics
      : "Bu eser için güfte kaydı bulunmamaktadır.";

  closeLyrics();
  resetProgress();
  setPlaying(false);
  updateRows();

  if (t.youtube_url) {
    if (!ytReady || !ytPlayer) {
      ytPending = { idx, play, myId };
      return;
    }
    loadYtTrack(idx, play, myId);
  } else {
    setTimeout(() => {
      if (playId !== myId) return; // Başka bir parça seçildiyse iptal
      audio.src = t.file_url;
      audio.load();
      if (play) {
        audio
          .play()
          .then(() => {
            if (playId === myId) setPlaying(true);
          })
          .catch((e) => console.warn("Audio:", e));
      }
    }, 80);
  }
}

function loadYtTrack(idx, play, myId) {
  const t = tracks[idx];
  const vid = ytVideoId(t.youtube_url);
  if (!vid || !ytPlayer) return;

  try {
    ytPlayer.cueVideoById(vid);
  } catch (e) {
    return;
  }

  if (play) {
    setTimeout(() => {
      if (playId !== myId) return; // Başka parça seçildiyse iptal
      try {
        if (ytPlayer && typeof ytPlayer.playVideo === "function")
          ytPlayer.playVideo();
      } catch (e) {}
    }, 800);
  }
}

function ytVideoId(url) {
  if (!url) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
  } catch {}
  return null;
}

// ---- Playback ----
function togglePlay() {
  if (currentIdx === -1 && tracks.length > 0) {
    selectTrack(0, true);
    return;
  }
  const t = tracks[currentIdx];

  if (t && t.youtube_url) {
    if (!ytPlayer) return;
    if (isPlaying) {
      ytPlayer.pauseVideo();
    } else {
      ytPlayer.playVideo();
    }
  } else {
    if (isPlaying) {
      audio.pause();
      setPlaying(false);
    } else {
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(console.error);
    }
  }
}

function setPlaying(val) {
  isPlaying = val;
  elOynatIkon.innerHTML = val
    ? '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>'
    : '<polygon points="5,3 19,12 5,21"/>';
  elMakam.classList.toggle("durdu", !val);
  elEtiket.classList.toggle("durdu", !val);
  elDurumYazi.textContent = val ? "İcra Ediliyor" : "Beklemede";
  updateRows();
}

function prevTrack() {
  if (!tracks.length) return;
  selectTrack((currentIdx - 1 + tracks.length) % tracks.length, isPlaying);
}

function nextTrack() {
  if (!tracks.length) return;
  selectTrack((currentIdx + 1) % tracks.length, isPlaying);
}

// ---- Audio progress (dosya modu) ----
audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  elDolu.style.width = (audio.currentTime / audio.duration) * 100 + "%";
  elSimdiki.textContent = fmt(audio.currentTime);
});

audio.addEventListener("loadedmetadata", () => {
  elToplam.textContent = fmt(audio.duration);
});

audio.addEventListener("ended", nextTrack);
audio.addEventListener("play", () => setPlaying(true));
audio.addEventListener("pause", () => setPlaying(false));

function seekClick(e) {
  const t = tracks[currentIdx];
  const rect = e.currentTarget.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;

  if (t && t.youtube_url && ytPlayer) {
    const dur = ytPlayer.getDuration() || 0;
    ytPlayer.seekTo(pct * dur, true);
  } else if (audio.duration) {
    audio.currentTime = pct * audio.duration;
  }
}

function resetProgress() {
  elDolu.style.width = "0%";
  elSimdiki.textContent = "0:00";
  elToplam.textContent = "0:00";
}

// ---- Volume ----
function setupVolume() {
  elSesSlider.addEventListener("input", () => {
    const val = parseInt(elSesSlider.value);
    const volume = val / 100;
    audio.volume = volume;
    if (ytPlayer && typeof ytPlayer.setVolume === "function")
      ytPlayer.setVolume(val);
    elSesDeger.textContent = val;
    elSesIkon.innerHTML =
      val === 0
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`
        : val < 50
          ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>`
          : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
  });
}

// ---- Güfte ----
function toggleLyrics() {
  lyricsOpen = !lyricsOpen;
  elLirikPanel.classList.toggle("acik", lyricsOpen);
  elLirikBtn.classList.toggle("aktif", lyricsOpen);
  elLirikBtn.textContent = lyricsOpen ? "Kapat" : "Güfte";
}

function closeLyrics() {
  lyricsOpen = false;
  elLirikPanel.classList.remove("acik");
  elLirikBtn.classList.remove("aktif");
  elLirikBtn.textContent = "Güfte";
}

// ---- Rows ----
function updateRows() {
  document.querySelectorAll(".p-satir").forEach((row, i) => {
    row.classList.toggle("aktif", i === currentIdx);
    row.classList.toggle("calıyor", i === currentIdx && isPlaying);
  });
}

// ---- Helpers ----
function fmt(s) {
  if (!s || isNaN(s)) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60)
    .toString()
    .padStart(2, "0")}`;
}

function escHtml(s) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
