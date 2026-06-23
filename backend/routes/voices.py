from fastapi import APIRouter
from services.tts import list_voices

router = APIRouter(prefix="/api/voices")

@router.get("")
def get_voices():
    return list_voices()
