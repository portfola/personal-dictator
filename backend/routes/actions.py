from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from models.dynamo import get_document, update_summary, add_message, get_messages
from services.storage import fetch_document
from services.parser import parse_sections
from services.ai import chat, SYSTEM_PROMPT
from services.tts import synthesize_to_url

router = APIRouter(prefix="/api/docs")

MAX_TTS_CHARS = 4500  # ElevenLabs Starter plan safe limit (~5k chars)

class DiscussRequest(BaseModel):
    message: str
    session_id: str
    mode: str = "voice"        # "voice" | "text"
    provider: str = "anthropic"

@router.post("/{doc_id}/summarize")
async def summarize(doc_id: str, provider: str = "anthropic"):
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404)

    if not doc.get("summary"):
        content = fetch_document(doc["s3_key"])
        summary = await chat(
            messages=[{"role": "user", "content": f"Summarize this document concisely:\n\n{content}"}],
            provider=provider,
        )
        update_summary(doc_id, summary)
    else:
        summary = doc["summary"]

    audio_url = synthesize_to_url(summary)
    return {"summary": summary, "audio_url": audio_url}

@router.get("/{doc_id}/read")
def read_doc(doc_id: str):
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404)
    content = fetch_document(doc["s3_key"])
    # Truncate to TTS char limit; long docs should use summarize instead
    content_for_tts = content[:MAX_TTS_CHARS]
    if len(content) > MAX_TTS_CHARS:
        content_for_tts += "\n\n[Document truncated for audio. Use Summarize for full overview.]"
    audio_url = synthesize_to_url(content_for_tts)
    return {"audio_url": audio_url, "truncated": len(content) > MAX_TTS_CHARS}

@router.post("/{doc_id}/discuss")
async def discuss(doc_id: str, req: DiscussRequest):
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404)

    content = fetch_document(doc["s3_key"])
    history = get_messages(doc_id, req.session_id)

    messages = [{"role": m["role"], "content": m["content"]} for m in history]
    messages.append({"role": "user", "content": req.message})

    system = f"{SYSTEM_PROMPT}\n\n--- DOCUMENT ---\n{content}\n--- END DOCUMENT ---"
    reply = await chat(messages=messages, system=system, provider=req.provider)

    add_message(req.session_id, doc_id, "user", req.message, req.mode)
    add_message(req.session_id, doc_id, "assistant", reply, req.mode)

    audio_url = synthesize_to_url(reply) if req.mode == "voice" else None
    return {"reply": reply, "audio_url": audio_url}
