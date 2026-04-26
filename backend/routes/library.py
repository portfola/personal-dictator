from fastapi import APIRouter, UploadFile, File, HTTPException
from models.dynamo import create_document, list_documents, get_document, delete_document
from services.storage import upload_document, delete_document as s3_delete

router = APIRouter(prefix="/api/library")

@router.get("")
def get_library():
    docs = list_documents()
    return [{
        "id": d["id"],
        "title": d["title"],
        "filename": d["filename"],
        "source": d["source"],
        "has_summary": bool(d.get("summary")),
        "updated_at": d["updated_at"],
    } for d in docs]

@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    if not file.filename.endswith((".md", ".txt")):
        raise HTTPException(status_code=400, detail="Only .md and .txt files supported")
    content = (await file.read()).decode("utf-8")
    s3_key = upload_document(file.filename, content)
    title = file.filename.rsplit(".", 1)[0].replace("-", " ").replace("_", " ").title()
    doc = create_document(title=title, filename=file.filename, source="upload", s3_key=s3_key)
    return {"id": doc["id"], "title": doc["title"]}

@router.delete("/{doc_id}")
def remove(doc_id: str):
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404)
    s3_delete(doc["s3_key"])
    delete_document(doc_id)
    return {"deleted": True}
