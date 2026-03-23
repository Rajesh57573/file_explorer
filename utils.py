import os
import re
import json
import uuid
import shutil
from datetime import datetime
import urllib.request

BASE_DIR = os.path.join(os.path.dirname(__file__), "storage")
TRASH_DIR = os.path.join(os.path.dirname(__file__), ".trash")
os.makedirs(TRASH_DIR, exist_ok=True)

# ─── Dictionary Setup ────────────────────────────────────────────────────────

DICT_PATH = os.path.join(os.path.dirname(__file__), "dictionary.txt")
DICT_URL = "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt"

def load_dictionary() -> set:
    """Load dictionary from local file, downloading it first if needed."""
    if not os.path.exists(DICT_PATH):
        print("[SpellChecker] Downloading dictionary...")
        urllib.request.urlretrieve(DICT_URL, DICT_PATH)
        print("[SpellChecker] Dictionary downloaded successfully!")

    with open(DICT_PATH, "r", encoding="utf-8") as f:
        words = set(word.strip().lower() for word in f if word.strip())
    print(f"[SpellChecker] Loaded {len(words):,} words into dictionary.")
    return words


# Load dictionary once at startup
DICTIONARY: set = load_dictionary()


# ─── Levenshtein Edit Distance ───────────────────────────────────────────────

def levenshtein_distance(word1: str, word2: str) -> int:
    """Compute the minimum edit distance between two words."""
    m, n = len(word1), len(word2)
    # Create a (m+1) x (n+1) DP table
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if word1[i - 1] == word2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(
                    dp[i - 1][j],      # deletion
                    dp[i][j - 1],      # insertion
                    dp[i - 1][j - 1]   # substitution
                )
    return dp[m][n]


def get_suggestions(word: str, max_suggestions: int = 5) -> list:
    """
    Find the closest dictionary words to the given misspelled word.
    Uses Levenshtein distance, filtering candidates by first letter and
    similar length for performance.
    """
    word = word.lower()
    word_len = len(word)

    # Narrow candidates: same first letter, length within ±2
    candidates = [
        w for w in DICTIONARY
        if w.startswith(word[0]) and abs(len(w) - word_len) <= 2
    ]

    # Score each candidate by edit distance
    scored = [(levenshtein_distance(word, candidate), candidate) for candidate in candidates]
    scored.sort(key=lambda x: x[0])

    # Return top N suggestions (only those with distance <= 3)
    return [w for dist, w in scored[:max_suggestions] if dist <= 3]


# ─── Rename ──────────────────────────────────────────────────────────────────

def rename_item(old_path, new_name):
    old_full = os.path.join(BASE_DIR, old_path)
    if not os.path.exists(old_full):
        return {"error": "Item not found"}

    new_full = os.path.join(os.path.dirname(old_full), new_name)
    os.rename(old_full, new_full)
    return {"message": f"Renamed to '{new_name}' successfully"}


# ─── Search ──────────────────────────────────────────────────────────────────

def search_items(query: str, type_filter: str = "all", ext_filter: str = ""):
    """
    Modern search with rich metadata, relevance sorting, and optional filters.
    - type_filter: 'all' | 'file' | 'folder'
    - ext_filter:  e.g. 'txt', 'md', 'py' (ignored for folders)
    """
    query_lower = query.strip().lower()
    ext_lower = ext_filter.strip().lower().lstrip(".")
    results = []

    for root, dirs, files in os.walk(BASE_DIR):
        entries = []
        if type_filter in ("all", "folder"):
            entries += [(d, True) for d in dirs]
        if type_filter in ("all", "file"):
            entries += [(f, False) for f in files]

        for name, is_dir in entries:
            name_lower = name.lower()

            # Query filter
            if query_lower and query_lower not in name_lower:
                continue

            # Extension filter (files only)
            if ext_lower and not is_dir:
                if not name_lower.endswith(f".{ext_lower}"):
                    continue

            full_path = os.path.join(root, name)
            rel_path = os.path.relpath(full_path, BASE_DIR)
            ext = "" if is_dir else os.path.splitext(name)[1].lstrip(".")

            try:
                stat = os.stat(full_path)
                size = stat.st_size if not is_dir else None
                modified = stat.st_mtime
            except OSError:
                size = None
                modified = None

            # Relevance scoring: exact=0, starts-with=1, contains=2
            if name_lower == query_lower:
                relevance = 0
            elif name_lower.startswith(query_lower):
                relevance = 1
            else:
                relevance = 2

            results.append({
                "name": name,
                "path": rel_path,
                "is_dir": is_dir,
                "extension": ext,
                "size": size,
                "modified": modified,
                "_relevance": relevance
            })

    # Sort: relevance first, then alphabetically
    results.sort(key=lambda x: (x["_relevance"], x["name"].lower()))

    # Remove internal relevance key
    for r in results:
        del r["_relevance"]

    return {"query": query, "count": len(results), "results": results}


# ─── Spell Check ─────────────────────────────────────────────────────────────

def check_spelling(subpath):
    full_path = os.path.join(BASE_DIR, subpath)

    if not os.path.exists(full_path):
        return {"error": "File not found"}

    if os.path.isdir(full_path):
        return {"error": "Path is a folder, not a file"}

    with open(full_path, "r", encoding="utf-8") as file:
        text = file.read()

    # Extract only alphabetic words (strip punctuation/numbers)
    raw_words = re.findall(r"[a-zA-Z]+", text)
    total_words = len(raw_words)

    # Check each word against the dictionary
    results = []
    seen = set()
    for word in raw_words:
        lower = word.lower()
        if lower in seen:
            continue
        seen.add(lower)

        if lower not in DICTIONARY:
            suggestions = get_suggestions(lower)
            results.append({
                "word": word,
                "suggestions": suggestions
            })

    return {
        "file": subpath,
        "total_words": total_words,
        "misspelled_count": len(results),
        "misspelled": results   # each entry has "word" + "suggestions"
    }


# ─── Trash ──────────────────────────────────────────────────────────────────

def move_to_trash(subpath: str) -> dict:
    """Move a file/folder from storage to the trash with metadata."""
    full_path = os.path.join(BASE_DIR, subpath)
    if not os.path.exists(full_path):
        return {"error": "Item not found"}

    trash_id = uuid.uuid4().hex[:12]  # short unique ID, URL-safe
    name = os.path.basename(full_path)
    trash_item_path = os.path.join(TRASH_DIR, trash_id)

    shutil.move(full_path, trash_item_path)

    meta = {
        "trash_id": trash_id,
        "name": name,
        "original_path": subpath,
        "is_dir": os.path.isdir(trash_item_path),
        "deleted_at": datetime.now().isoformat(),
    }
    with open(os.path.join(TRASH_DIR, f"{trash_id}.json"), "w") as f:
        json.dump(meta, f)

    return {"message": f"'{name}' moved to trash", "trash_id": trash_id}


def list_trash() -> dict:
    """Return all items currently in the trash with their metadata."""
    items = []
    for fname in os.listdir(TRASH_DIR):
        if not fname.endswith(".json"):
            continue
        meta_path = os.path.join(TRASH_DIR, fname)
        try:
            with open(meta_path, "r") as f:
                meta = json.load(f)
            # Only include if the actual item still exists in trash
            if os.path.exists(os.path.join(TRASH_DIR, meta["trash_id"])):
                items.append(meta)
        except (json.JSONDecodeError, KeyError):
            continue

    items.sort(key=lambda x: x.get("deleted_at", ""), reverse=True)
    return {"count": len(items), "items": items}


def restore_from_trash(trash_id: str) -> dict:
    """Restore a trashed item back to its original path."""
    meta_path = os.path.join(TRASH_DIR, f"{trash_id}.json")
    if not os.path.exists(meta_path):
        return {"error": "Item not found in trash"}

    with open(meta_path, "r") as f:
        meta = json.load(f)

    trash_item_path = os.path.join(TRASH_DIR, trash_id)
    original_path = os.path.join(BASE_DIR, meta["original_path"])

    if os.path.exists(original_path):
        return {"error": f"A file or folder already exists at '{meta['original_path']}'"}

    os.makedirs(os.path.dirname(original_path), exist_ok=True)
    shutil.move(trash_item_path, original_path)
    os.remove(meta_path)

    return {"message": f"'{meta['name']}' restored to '{meta['original_path']}'"}


def permanent_delete(trash_id: str) -> dict:
    """Permanently destroy one item from the trash."""
    meta_path = os.path.join(TRASH_DIR, f"{trash_id}.json")
    if not os.path.exists(meta_path):
        return {"error": "Item not found in trash"}

    with open(meta_path, "r") as f:
        meta = json.load(f)

    trash_item_path = os.path.join(TRASH_DIR, trash_id)
    if os.path.isdir(trash_item_path):
        shutil.rmtree(trash_item_path)
    elif os.path.exists(trash_item_path):
        os.remove(trash_item_path)
    os.remove(meta_path)

    return {"message": f"'{meta['name']}' permanently deleted"}


def empty_trash() -> dict:
    """Permanently destroy every item in the trash."""
    count = 0
    for fname in os.listdir(TRASH_DIR):
        item_path = os.path.join(TRASH_DIR, fname)
        if os.path.isdir(item_path):
            shutil.rmtree(item_path)
        else:
            os.remove(item_path)
        count += 1
    return {"message": f"Trash emptied", "items_removed": count // 2}  # each item has 1 file + 1 meta