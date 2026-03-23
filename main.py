import os
import shutil
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from utils import rename_item, search_items, check_spelling, move_to_trash, list_trash, restore_from_trash, permanent_delete, empty_trash  # ✅ all helpers imported

BASE_DIR = os.path.join(os.path.dirname(__file__), "storage")
os.makedirs(BASE_DIR, exist_ok=True)

app = FastAPI()

# ✅ Allow frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ✅ Helper: list directory contents
def list_directory(path: str):
    try:
        items = []
        with os.scandir(path) as entries:
            for entry in entries:
                items.append({
                    "name": entry.name,
                    "is_dir": entry.is_dir(),
                    "path": os.path.relpath(entry.path, BASE_DIR)
                })
        return items
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Directory not found")


# ✅ List files/folders
@app.get("/list/{subpath:path}")
async def list_files(subpath: str = ""):
    path = os.path.join(BASE_DIR, subpath)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Path not found")
    return list_directory(path)


# ✅ Create folder
@app.post("/create-folder")
async def create_folder(item: dict):
    path = os.path.join(BASE_DIR, item["path"])
    os.makedirs(path, exist_ok=True)

    parent = os.path.dirname(path) if os.path.dirname(path) else BASE_DIR
    return {
        "message": f"Folder '{item['path']}' created successfully",
        "contents": list_directory(parent)
    }


# ✅ Upload file
@app.post("/upload-file/{subpath:path}")
async def upload_file(subpath: str, file: UploadFile = File(...)):
    folder_path = os.path.normpath(os.path.join(BASE_DIR, subpath))

    if not folder_path.startswith(BASE_DIR):
        raise HTTPException(status_code=400, detail="Invalid path")

    os.makedirs(folder_path, exist_ok=True)
    file_path = os.path.join(folder_path, file.filename)

    with open(file_path, "wb") as f:
        f.write(await file.read())

    return {
        "message": f"File '{file.filename}' uploaded successfully",
        "contents": list_directory(folder_path)
    }


# ✅ Delete file/folder
@app.delete("/delete/{subpath:path}")
async def delete_path(subpath: str):
    path = os.path.join(BASE_DIR, subpath)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Path not found")

    if os.path.isdir(path):
        shutil.rmtree(path)
    else:
        os.remove(path)

    parent = os.path.dirname(path) if os.path.dirname(path) else BASE_DIR
    return {
        "message": f"Deleted '{subpath}'",
        "contents": list_directory(parent)
    }


# ✅ Rename file/folder
@app.post("/rename")
async def rename_api(item: dict):
    result = rename_item(item.get("old_path", ""), item.get("new_name", ""))
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# ✅ Search
@app.get("/search")
async def search_api(query: str = "", type: str = "all", ext: str = ""):
    return search_items(query, type_filter=type, ext_filter=ext)


# ✅ Spell Checker (main feature)
@app.get("/spellcheck/{subpath:path}")
async def spell_check_api(subpath: str):
    result = check_spelling(subpath)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# ───── Trash Endpoints ────────────────────────────────────────────────────────

# ✅ Move item to trash (soft delete)
@app.post("/trash/move/{subpath:path}")
async def trash_move(subpath: str):
    result = move_to_trash(subpath)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# ✅ List all items in trash
@app.get("/trash/list")
async def trash_list():
    return list_trash()


# ✅ Restore item from trash to original location
@app.post("/trash/restore/{trash_id}")
async def trash_restore(trash_id: str):
    result = restore_from_trash(trash_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# ✅ Permanently delete one item from trash
@app.delete("/trash/delete/{trash_id}")
async def trash_permanent_delete(trash_id: str):
    result = permanent_delete(trash_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# ✅ Empty entire trash
@app.delete("/trash/empty")
async def trash_empty():
    return empty_trash()