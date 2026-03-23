const BASE_URL = "http://127.0.0.1:8000";
let currentPath = "";

/* ===== API Helper ===== */
async function apiRequest(url, options = {}) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("API Error:", err);
    showToast("❌ Error connecting to server.", "error");
    return null;
  }
}

function joinPath(base, extra) {
  return [base, extra].filter(Boolean).join("/").replace(/\/+/g, "/");
}

/* ===== Toast ===== */
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  const sounds = { success: "sounds/success.mp3", warning: "sounds/warning.mp3", error: "sounds/error2.mp3", info: "sounds/info.mp3" };
  if (sounds[type]) { const a = new Audio(sounds[type]); a.volume = 0.6; a.play().catch(() => {}); }

  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 400); }, 3000);
}

/* ===== List Files ===== */
async function listFiles(path) {
  currentPath = path;
  if (typeof updateBreadcrumb === "function") updateBreadcrumb(path);

  const ul = document.getElementById("fileList");
  ul.innerHTML = `
    <li class="file-item go-up-item" style="display:flex;align-items:center;justify-content:center;padding:18px;opacity:.4;pointer-events:none">
      <div class="file-icon is-folder"><i class="ri-loader-4-line ri-spin"></i></div>
    </li>`;

  const data = await apiRequest(`${BASE_URL}/list/${path}`);
  if (!data) return;

  ul.innerHTML = "";

  // Item count
  const countEl = document.getElementById("itemCount");
  if (countEl) countEl.textContent = data.length ? `${data.length} item${data.length !== 1 ? "s" : ""}` : "";

  // Empty state
  if (data.length === 0 && !path) {
    ul.innerHTML = `
      <li style="grid-column:1/-1;list-style:none">
        <div class="empty-state">
          <div class="empty-state-icon"><i class="ri-folder-open-line"></i></div>
          <h4>This folder is empty</h4>
          <p>Create a file or folder to get started</p>
        </div>
      </li>`;
    return;
  }

  // Go Up
  if (path) {
    const liUp = document.createElement("li");
    liUp.className = "file-item go-up-item";
    liUp.title = "Go up one level";
    liUp.innerHTML = `
      <div class="file-icon is-folder"><i class="ri-arrow-up-line"></i></div>
      <span class="file-label">.. Go up</span>`;
    liUp.onclick = () => {
      const parts = path.split("/").filter(Boolean);
      parts.pop();
      listFiles(parts.join("/"));
    };
    ul.appendChild(liUp);
  }

  data.forEach(item => {
    const li = document.createElement("li");
    li.className = "file-item";

    const iconClass = item.is_dir ? "is-folder" : "is-file";
    const iconName = item.is_dir ? "ri-folder-fill" : getFileIcon(item.name);

    li.innerHTML = `
      <div class="file-icon ${iconClass}"><i class="${iconName}"></i></div>
      <span class="file-label" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
      <div class="file-actions">
        <button class="rename-btn" title="Rename"><i class="ri-edit-line"></i></button>
        <button class="delete-btn" title="Delete"><i class="ri-delete-bin-6-line"></i></button>
      </div>`;

    if (item.is_dir) {
      li.querySelector(".file-label").style.cursor = "pointer";
      li.querySelector(".file-label").onclick = () => listFiles(item.path);
      li.querySelector(".file-icon").style.cursor = "pointer";
      li.querySelector(".file-icon").onclick = () => listFiles(item.path);
    }

    li.querySelector(".rename-btn").onclick = (e) => { e.stopPropagation(); renamePath(item.path); };
    li.querySelector(".delete-btn").onclick = (e) => { e.stopPropagation(); deletePath(item.path); };

    ul.appendChild(li);
  });

  updateTrashBadge();
}

function getFileIcon(name) {
  const ext = name.split(".").pop().toLowerCase();
  const map = {
    pdf: "ri-file-pdf-line", jpg: "ri-image-line", jpeg: "ri-image-line",
    png: "ri-image-line", gif: "ri-image-line", mp4: "ri-video-line",
    mp3: "ri-music-line", zip: "ri-file-zip-line", rar: "ri-file-zip-line",
    js: "ri-javascript-line", ts: "ri-code-line", py: "ri-code-line",
    html: "ri-html5-line", css: "ri-css3-line", json: "ri-braces-line",
    txt: "ri-file-text-line", md: "ri-markdown-line", csv: "ri-table-line",
    doc: "ri-file-word-line", docx: "ri-file-word-line",
    xls: "ri-file-excel-line", xlsx: "ri-file-excel-line",
  };
  return map[ext] || "ri-file-line";
}

/* ===== Create Folder ===== */
async function createFolder() {
  const folderName = document.getElementById("folderPath").value.trim();
  if (!folderName) return showToast("⚠️ Enter a folder name", "warning");

  const fullPath = joinPath(currentPath, folderName);
  const data = await apiRequest(`${BASE_URL}/create-folder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: fullPath }),
  });

  if (data) {
    showToast(`✅ Folder "${folderName}" created`, "success");
    listFiles(currentPath);
    document.getElementById("folderPath").value = "";
    if (typeof closeCreateFolderModal === "function") closeCreateFolderModal();
  }
}

/* ===== Upload File ===== */
async function uploadFile() {
  const uploadPathInput = document.getElementById("uploadPath");
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];

  if (!file) return showToast("📁 Please select a file", "warning");
  const targetPath = (uploadPathInput?.value.trim()) || currentPath || "";

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${BASE_URL}/upload-file/${targetPath}`, { method: "POST", body: formData });
    const data = await res.json();
    showToast(`📤 ${data.message}`, "success");
    listFiles(currentPath);
    fileInput.value = "";
    uploadPathInput && (uploadPathInput.value = "");
  } catch { showToast("❌ Upload failed!", "error"); }
}

/* ===== Delete Modal ===== */
function showDeleteModal(path, onConfirm) {
  const modal = document.createElement("div");
  modal.className = "custom-modal-overlay";
  modal.innerHTML = `
    <div class="custom-modal">
      <div class="modal-header">
        <i class="ri-error-warning-line"></i>
        <h3>Move to Trash?</h3>
      </div>
      <p>Move <span class="file-name-text">"${escapeHtml(path)}"</span> to trash?</p>
      <div class="modal-actions">
        <button class="cancel-btn">Cancel</button>
        <button class="confirm-btn">Move to Trash</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector(".confirm-btn").onclick = () => { onConfirm(); modal.remove(); };
  modal.querySelector(".cancel-btn").onclick = () => modal.remove();
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
}

/* ===== Rename Modal ===== */
function showRenameModal(oldPath, onConfirm) {
  const modal = document.createElement("div");
  modal.className = "custom-modal-overlay";
  modal.innerHTML = `
    <div class="custom-modal">
      <div class="modal-header">
        <i class="ri-edit-line"></i>
        <h3>Rename</h3>
      </div>
      <p>Rename <span class="file-name-text">"${escapeHtml(oldPath)}"</span></p>
      <input type="text" id="renameInput" placeholder="New name…" autofocus />
      <div class="modal-actions">
        <button class="cancel-btn">Cancel</button>
        <button class="confirm-btn">Rename</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const input = modal.querySelector("#renameInput");
  input.focus();
  input.onkeydown = e => { if (e.key === "Enter") modal.querySelector(".confirm-btn").click(); };

  modal.querySelector(".confirm-btn").onclick = () => {
    const n = input.value.trim();
    if (n) { onConfirm(n); modal.remove(); }
    else showToast("⚠️ Enter a valid name", "warning");
  };
  modal.querySelector(".cancel-btn").onclick = () => modal.remove();
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
}

/* ===== Delete → Trash ===== */
async function deletePath(path) {
  showDeleteModal(path, async () => {
    const data = await apiRequest(`${BASE_URL}/trash/move/${path}`, { method: "POST" });
    if (data) {
      showToast(`🗑️ Moved to Trash`, "success");
      listFiles(currentPath);
      updateTrashBadge();
    }
  });
}

/* ===== Trash Panel ===== */
function openTrashPanel() {
  if (document.getElementById("trashPanel")) return;
  const panel = document.createElement("div");
  panel.id = "trashPanel";
  panel.className = "trash-panel-overlay";
  panel.innerHTML = `
    <div class="trash-panel">
      <div class="trash-panel-header">
        <span><i class="ri-delete-bin-6-line"></i> Trash</span>
        <div style="display:flex;gap:10px;align-items:center;">
          <button class="empty-trash-btn" onclick="emptyTrash()"><i class="ri-fire-line"></i> Empty Trash</button>
          <button onclick="document.getElementById('trashPanel').remove()"
            style="background:none;border:none;color:var(--text-secondary);font-size:1.2rem;cursor:pointer;display:flex;align-items:center">
            <i class="ri-close-line"></i>
          </button>
        </div>
      </div>
      <div id="trashItems" class="trash-items-list">
        <div class="trash-empty-state"><i class="ri-loader-4-line" style="font-size:22px"></i><span>Loading…</span></div>
      </div>
    </div>`;
  document.body.appendChild(panel);
  panel.onclick = e => { if (e.target === panel) panel.remove(); };
  loadTrashItems();
}

async function loadTrashItems() {
  const data = await apiRequest(`${BASE_URL}/trash/list`);
  const container = document.getElementById("trashItems");
  if (!data || !container) return;

  if (data.count === 0) {
    container.innerHTML = `<div class="trash-empty-state"><i class="ri-delete-bin-6-line" style="font-size:32px;opacity:.3"></i><p>Trash is empty</p></div>`;
    return;
  }

  const formatDate = iso => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

  container.innerHTML = data.items.map(item => `
    <div class="trash-item" id="trash-${item.trash_id}">
      <div class="trash-item-icon ${item.is_dir ? 'ti-folder' : 'ti-file'}">
        <i class="ri-${item.is_dir ? 'folder-fill' : 'file-line'}"></i>
      </div>
      <div class="trash-item-info">
        <div class="trash-item-name">${escapeHtml(item.name)}</div>
        <div class="trash-item-meta">
          <span><i class="ri-map-pin-line"></i> ${escapeHtml(item.original_path)}</span>
          <span><i class="ri-time-line"></i> ${formatDate(item.deleted_at)}</span>
        </div>
      </div>
      <div class="trash-item-actions">
        <button class="restore-btn" onclick="restoreItem('${item.trash_id}')"><i class="ri-arrow-go-back-line"></i> Restore</button>
        <button class="pdel-btn" onclick="permanentDeleteItem('${item.trash_id}','${escapeHtml(item.name)}')"><i class="ri-skull-line"></i> Delete</button>
      </div>
    </div>`).join("");
}

async function restoreItem(trashId) {
  const data = await apiRequest(`${BASE_URL}/trash/restore/${trashId}`, { method: "POST" });
  if (data) { showToast(`✅ ${data.message}`, "success"); loadTrashItems(); listFiles(currentPath); updateTrashBadge(); }
}

async function permanentDeleteItem(trashId, name) {
  const modal = document.createElement("div");
  modal.className = "custom-modal-overlay";
  modal.innerHTML = `
    <div class="custom-modal">
      <div class="modal-header"><i class="ri-skull-line"></i><h3>Delete Forever?</h3></div>
      <p><b>"${escapeHtml(name)}"</b> will be permanently deleted. This cannot be undone.</p>
      <div class="modal-actions">
        <button class="cancel-btn">Cancel</button>
        <button class="confirm-btn" style="background:#ef4444">Delete Forever</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector(".confirm-btn").onclick = async () => {
    modal.remove();
    const data = await apiRequest(`${BASE_URL}/trash/delete/${trashId}`, { method: "DELETE" });
    if (data) { showToast(`☠️ '${name}' permanently deleted`, "error"); loadTrashItems(); updateTrashBadge(); }
  };
  modal.querySelector(".cancel-btn").onclick = () => modal.remove();
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
}

async function emptyTrash() {
  const modal = document.createElement("div");
  modal.className = "custom-modal-overlay";
  modal.innerHTML = `
    <div class="custom-modal">
      <div class="modal-header"><i class="ri-fire-line" style="color:#ef4444"></i><h3>Empty Trash?</h3></div>
      <p>All items will be <b>permanently deleted</b>. This cannot be undone.</p>
      <div class="modal-actions">
        <button class="cancel-btn">Cancel</button>
        <button class="confirm-btn" style="background:#ef4444">Empty Trash</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector(".confirm-btn").onclick = async () => {
    modal.remove();
    const data = await apiRequest(`${BASE_URL}/trash/empty`, { method: "DELETE" });
    if (data) { showToast(`🗑️ Trash emptied`, "success"); loadTrashItems(); updateTrashBadge(); }
  };
  modal.querySelector(".cancel-btn").onclick = () => modal.remove();
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
}

async function updateTrashBadge() {
  const data = await apiRequest(`${BASE_URL}/trash/list`);
  const badge = document.getElementById("trashBadge");
  if (!badge) return;
  if (data && data.count > 0) { badge.textContent = data.count; badge.style.display = "flex"; }
  else { badge.style.display = "none"; }
}

/* ===== Rename ===== */
async function renamePath(oldPath) {
  showRenameModal(oldPath, async newName => {
    const data = await apiRequest(`${BASE_URL}/rename`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ old_path: oldPath, new_name: newName }),
    });
    if (data) { showToast("✅ Renamed successfully", "success"); listFiles(currentPath); }
  });
}

/* ===== Search ===== */
let searchDebounceTimer = null;
let activeFilter = "all";

function debouncedSearch() {
  const input = document.getElementById("searchInput");
  const clearBtn = document.getElementById("searchClearBtn");
  clearBtn.style.display = input.value ? "flex" : "none";
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => runSearch(), 300);
}

function setFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll(".filter-pill").forEach(b => b.classList.remove("active"));
  const el = document.getElementById(`filter-${filter}`);
  if (el) el.classList.add("active");
  runSearch();
}

function clearSearch() {
  document.getElementById("searchInput").value = "";
  document.getElementById("searchClearBtn").style.display = "none";
  document.getElementById("searchResultsPanel").style.display = "none";
}

async function runSearch() {
  const query = document.getElementById("searchInput").value.trim();
  const panel = document.getElementById("searchResultsPanel");

  if (!query) { panel.style.display = "none"; return; }

  panel.style.display = "block";
  panel.innerHTML = `<div class="search-loading"><i class="ri-loader-4-line"></i> Searching…</div>`;

  const url = `${BASE_URL}/search?query=${encodeURIComponent(query)}&type=${activeFilter}`;
  const data = await apiRequest(url);
  if (!data) { panel.style.display = "none"; return; }

  if (data.count === 0) {
    panel.innerHTML = `<div class="search-empty"><i class="ri-search-line" style="font-size:24px"></i><p>No results for <b>"${escapeHtml(query)}"</b></p></div>`;
    return;
  }

  const formatSize = b => {
    if (b === null || b === undefined) return "";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };
  const formatDate = ts => ts ? new Date(ts * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

  const highlightMatch = (text, q) => {
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return escapeHtml(text);
    return escapeHtml(text.slice(0, idx)) + `<mark class="search-highlight">${escapeHtml(text.slice(idx, idx + q.length))}</mark>` + escapeHtml(text.slice(idx + q.length));
  };

  const items = data.results.map(item => {
    const pathParts = item.path.split("/");
    const displayPath = pathParts.length > 1 ? pathParts.slice(0, -1).join(" / ") : "Home";
    return `
      <div class="search-result-item" onclick="${item.is_dir ? `listFiles('${item.path}');clearSearch();` : ""}" title="${escapeHtml(item.path)}">
        <div class="result-icon ${item.is_dir ? 'icon-folder' : 'icon-file'}">
          <i class="${item.is_dir ? 'ri-folder-fill' : 'ri-file-line'}"></i>
        </div>
        <div class="result-info">
          <div class="result-name">${highlightMatch(item.name, query)}</div>
          <div class="result-meta">
            <span><i class="ri-map-pin-line"></i> ${escapeHtml(displayPath)}</span>
            ${item.size !== null ? `<span>${formatSize(item.size)}</span>` : ""}
            ${item.modified ? `<span>${formatDate(item.modified)}</span>` : ""}
          </div>
        </div>
        <div class="result-badge">${item.is_dir ? "Folder" : (item.extension?.toUpperCase() || "File")}</div>
      </div>`;
  }).join("");

  panel.innerHTML = `
    <div class="search-header">
      <i class="ri-search-line"></i> <b>${data.count}</b> result${data.count !== 1 ? "s" : ""} for <b>"${escapeHtml(query)}"</b>
    </div>
    <div class="search-results-list">${items}</div>`;
}

/* ===== Spell Check ===== */
async function spellCheckFile() {
  const filePath = document.getElementById("spellCheckPath").value.trim();
  if (!filePath) return showToast("⚠️ Please enter a file path", "warning");

  showToast("🧠 Checking spelling…", "info");
  const data = await apiRequest(`${BASE_URL}/spellcheck/${filePath}`);
  if (!data) return;
  if (data.error) { showToast(`❌ ${data.error}`, "error"); return; }

  const existing = document.getElementById("spellCheckModal");
  if (existing) existing.remove();

  if (data.misspelled && data.misspelled.length > 0) {
    const rows = data.misspelled.map(item => `
      <tr>
        <td style="padding:8px 12px;color:#ef4444;font-weight:500;font-family:var(--font-mono)">❌ ${escapeHtml(item.word)}</td>
        <td style="padding:8px 12px;">
          ${item.suggestions.length
            ? item.suggestions.map(s => `<span style="background:var(--accent-lt);color:var(--accent);border-radius:4px;padding:2px 8px;margin:2px;display:inline-block;font-size:12px">✔ ${s}</span>`).join(" ")
            : "<span style='color:var(--text-secondary);font-size:12px'>No suggestions</span>"}
        </td>
      </tr>`).join("");

    const modal = document.createElement("div");
    modal.id = "spellCheckModal";
    modal.className = "custom-modal-overlay";
    modal.innerHTML = `
      <div class="custom-modal" style="max-width:600px;width:90%;max-height:80vh;overflow-y:auto;">
        <div class="modal-header">
          <i class="ri-magic-line"></i>
          <h3>Spell Check — ${escapeHtml(data.file)}</h3>
          <button onclick="document.getElementById('spellCheckModal').remove()"
            style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--text-secondary);margin-left:auto;display:flex;align-items:center">
            <i class="ri-close-line"></i>
          </button>
        </div>
        <p style="color:var(--text-secondary);font-size:13px;margin-bottom:14px">
          Total: <b style="color:var(--text-primary)">${data.total_words}</b> words &nbsp;·&nbsp;
          Misspelled: <b style="color:#ef4444">${data.misspelled_count}</b>
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              <th style="text-align:left;padding:8px 12px;color:var(--text-secondary);font-weight:500">Word</th>
              <th style="text-align:left;padding:8px 12px;color:var(--text-secondary);font-weight:500">Suggestions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    document.body.appendChild(modal);
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
  } else {
    showToast("✅ No spelling mistakes found!", "success");
  }

  document.getElementById("spellCheckPath").value = "";
}

/* ===== Helpers ===== */
function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
async function searchItems() { runSearch(); }
