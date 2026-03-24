# 📁 FlexiFile — File Explorer Application

A full-stack **file explorer web application** with a Python FastAPI backend and a HTML/CSS/JavaScript frontend. FlexiFile lets you browse, create, upload, rename, delete files and folders — and even **spell-check** the content of any text file using a custom-built spell checker with smart word suggestions.

---

## 🚀 Features

| Feature | Description |
|---|---|
| 📂 **Browse Files** | Navigate through folders and files in a tree-like view |
| ➕ **Create Folders** | Create new directories anywhere in the file tree |
| 📤 **Upload Files** | Upload files into any folder |
| ✏️ **Rename** | Rename any file or folder via a modal dialog |
| 🗑️ **Delete** | Delete files/folders with a confirmation modal |
| 🔍 **Search** | Search for files and folders by name |
| 🔤 **Spell Check** | Check spelling in text files with smart correction suggestions |
| 🌙 **Dark / Light Theme** | Toggle between dark and light mode (saved to localStorage) |
| 🔊 **Sound Feedback** | Audio cues for success, error, and info actions |

---

## 🗂️ Project Structure

```
File_explorer_application/
├── backend/
│   ├── main.py              # FastAPI app — all REST API routes
│   ├── utils.py             # Helper functions: rename, search, spell check
│   ├── dictionary.txt       # Auto-downloaded word list (370,105 words)
│   ├── storage/             # All user files and folders are stored here
│   └── venv/                # Python virtual environment
│
└── frontend/
    └── Updated_frontend/
        ├── index.html       # Main HTML page
        ├── script.js        # Core JS logic (API calls, UI rendering)
        ├── script2.js       # Additional scripts
        ├── style.css        # Main stylesheet
        ├── style2.css       # Additional styles
        ├── assets/          # Images and icons
        └── sounds/          # Audio feedback files
```

---

## 🛠️ Tech Stack

### Backend
- **Python 3.14**
- **FastAPI** — REST API framework
- **Uvicorn** — ASGI server
- **python-multipart** — File upload support
- **Custom Spell Checker** — Built from scratch using:
  - 370,105-word English dictionary (auto-downloaded on first run)
  - **Levenshtein Edit Distance** algorithm for word suggestions

### Frontend
- **HTML5** — Semantic structure
- **Vanilla CSS** — Custom styling with dark/light theme support
- **Vanilla JavaScript** — No frameworks, pure JS
- **Font Awesome** + **Remixicon** — Icons
- **Web Audio API** — Sound feedback on actions

---

## ⚙️ Setup & Running

### Prerequisites
- Python 3.10+
- A modern web browser

---

### 1. Clone / Open the Project

```bash
cd /home/kailash-hp/File_explorer_application
```

---

### 2. Set Up Python Virtual Environment

```bash
cd backend
python -m venv venv
```

Activate the virtual environment:
```bash
source venv/bin/activate      # Linux/macOS
venv\Scripts\activate         # Windows
```

---

### 3. Install Dependencies

```bash
pip install fastapi uvicorn python-multipart pyspellchecker
```

> **Note:** The custom spell checker auto-downloads `dictionary.txt` (370k words) on first startup. No extra install needed.

---

### 4. Start the Backend Server

> ⚠️ Always use `venv/bin/python -m uvicorn` (not bare `uvicorn`) to ensure the correct Python environment is used.

```bash
cd /home/kailash-hp/File_explorer_application/backend
venv/bin/python -m uvicorn main:app --reload
```

The API will be live at:
- **Base URL:** `http://127.0.0.1:8000`
- **Swagger Docs:** `http://127.0.0.1:8000/docs`
- **ReDoc:** `http://127.0.0.1:8000/redoc`

---

### 5. Open the Frontend

Open this file directly in your browser:

```
frontend/Updated_frontend/index.html
```

Or, if you have a local server (e.g. VS Code Live Server), serve the `Updated_frontend/` folder.

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/list/{subpath}` | List files and folders at a path |
| `POST` | `/create-folder` | Create a new folder |
| `POST` | `/upload-file/{subpath}` | Upload a file to a folder |
| `DELETE` | `/delete/{subpath}` | Delete a file or folder |
| `POST` | `/rename` | Rename a file or folder |
| `GET` | `/search?query=...` | Search files/folders by name |
| `GET` | `/spellcheck/{subpath}` | Spell-check a text file |

### Spell Check Response Example

```json
{
  "file": "TEST/test22.txt",
  "total_words": 120,
  "misspelled_count": 3,
  "misspelled": [
    { "word": "goood",  "suggestions": ["good", "goose", "god"] },
    { "word": "plese",  "suggestions": ["please", "pleat"] },
    { "word": "healp",  "suggestions": ["help", "heal", "heals"] }
  ]
}
```

---

## 🔤 How the Custom Spell Checker Works

1. **Dictionary Download** — On first run, the app automatically downloads a list of **370,105 English words** from [dwyl/english-words](https://github.com/dwyl/english-words) and saves it as `dictionary.txt`.

2. **Word Lookup** — Each word in the file is looked up in the dictionary set (O(1) lookup time).

3. **Suggestions via Levenshtein Distance** — For any misspelled word, the algorithm:
   - Filters candidates with the same first letter and similar length
   - Computes edit distance to all candidates
   - Returns the top 5 closest real words

```
"speling"  →  suggestions: ["spelling", "speeling", ...]
"recieve"  →  suggestions: ["receive", "relieve", ...]
```

---

## 🧪 Testing the Spell Checker

A test file with intentional spelling mistakes is available at:
```
backend/storage/TEST/test22.txt
```

In the frontend, enter `TEST/test22.txt` in the **Spell Check** input and click **Spell Check** to see the results modal.

---

## 🎨 UI Features

- **Dark / Light Theme** toggle (persisted via `localStorage`)
- Smooth **toast notifications** with sound for all actions
- **Confirmation modals** for delete and rename
- **Spell check results modal** — shows each misspelled word with suggestions in a styled table

---

## 📝 Notes

- All files are stored inside `backend/storage/`. This is the root directory for the file explorer.
- The `dictionary.txt` is downloaded automatically on first server startup — no manual step required.
- The backend uses CORS with `allow_origins=["*"]`, so the frontend can connect from any origin during development.

---

## 👨‍💻 Author

**Kailash, Abhishek, Rajesh, Arunima** — File Explorer Application Project
