import logging
import os
import re
from elevenlabs.client import ElevenLabs
from elevenlabs.core.api_error import ApiError
from elevenlabs.types.voice_settings import VoiceSettings
from services.storage import audio_cache_key, audio_exists, upload_audio, get_audio_presigned_url
from dotenv import load_dotenv

load_dotenv()

client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))
VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
VOICE_SPEED = float(os.getenv("ELEVENLABS_VOICE_SPEED", "1.1"))
VOICE_STABILITY = float(os.getenv("ELEVENLABS_VOICE_STABILITY", "0.5"))
VOICE_SIMILARITY = float(os.getenv("ELEVENLABS_VOICE_SIMILARITY", "0.75"))


_CODE_FENCE = re.compile(r"```.*?```", re.DOTALL)
_INLINE_CODE = re.compile(r"`([^`]+)`")
_IMAGE = re.compile(r"!\[([^\]]*)\]\([^)]*\)")
_LINK = re.compile(r"\[([^\]]+)\]\([^)]*\)")
_AUTOLINK = re.compile(r"<((?:https?|mailto):[^>]+)>")
_BARE_URL = re.compile(r"https?://\S+")
_HTML_TAG = re.compile(r"<[^>]+>")
_HEADING = re.compile(r"^\s{0,3}#{1,6}\s*", re.MULTILINE)
_BLOCKQUOTE = re.compile(r"^\s{0,3}>\s?", re.MULTILINE)
_HRULE = re.compile(r"^\s{0,3}(?:[-*_]\s*){3,}$", re.MULTILINE)
_LIST_BULLET = re.compile(r"^(\s*)[-*+]\s+", re.MULTILINE)
_TABLE_SEPARATOR = re.compile(r"^\s*\|?\s*:?-{3,}:?(?:\s*\|\s*:?-{3,}:?)+\s*\|?\s*$", re.MULTILINE)
_TABLE_EDGE_PIPE = re.compile(r"^[ \t]*\|[ \t]*|[ \t]*\|[ \t]*$", re.MULTILINE)
_TABLE_PIPES = re.compile(r"[ \t]*\|[ \t]*")
_MULTI_SPACE = re.compile(r"[ \t]{2,}")
_BOLD_ITALIC = re.compile(r"(\*{1,3}|_{1,3})(\S.*?\S|\S)\1")
_STRIKETHROUGH = re.compile(r"~~(.+?)~~")
_MULTI_BLANK = re.compile(r"\n{3,}")
_TRAILING_WS = re.compile(r"[ \t]+(\n|$)")


def speakable_text(text: str) -> str:
    """Strip markdown syntax so TTS doesn't read out 'hash hash', 'asterisk', etc."""
    if not text:
        return text

    t = _CODE_FENCE.sub("", text)
    t = _IMAGE.sub(r"\1", t)
    t = _LINK.sub(r"\1", t)
    t = _AUTOLINK.sub(r"\1", t)
    t = _BARE_URL.sub("", t)
    t = _INLINE_CODE.sub(r"\1", t)
    t = _HTML_TAG.sub("", t)
    t = _HRULE.sub("", t)
    t = _HEADING.sub("", t)
    t = _BLOCKQUOTE.sub("", t)
    t = _LIST_BULLET.sub(r"\1", t)
    t = _TABLE_SEPARATOR.sub("", t)
    t = _TABLE_EDGE_PIPE.sub("", t)
    t = _TABLE_PIPES.sub(", ", t)
    t = _STRIKETHROUGH.sub(r"\1", t)
    # Apply bold/italic twice to catch nested markers like ***word***
    t = _BOLD_ITALIC.sub(r"\2", t)
    t = _BOLD_ITALIC.sub(r"\2", t)

    t = _MULTI_SPACE.sub(" ", t)
    t = _TRAILING_WS.sub(r"\1", t)
    t = _MULTI_BLANK.sub("\n\n", t)
    return t.strip()


def list_voices() -> list[dict]:
    """Return the ElevenLabs voices available on this account as {id, name}.

    Degrades gracefully: a TTS-only API key (missing the `voices_read`
    permission) can still synthesize speech, so rather than 500 the whole
    picker we fall back to the single configured default voice.
    """
    try:
        return [
            {"id": v.voice_id, "name": v.name}
            for v in client.voices.get_all().voices
        ]
    except ApiError as e:
        logging.warning("Could not list ElevenLabs voices (status=%s): %s", e.status_code, e.body)
        return [{"id": VOICE_ID, "name": "Default"}]


def synthesize_to_url(text: str, voice_id: str | None = None) -> str:
    """
    Synthesize text to speech. Returns a presigned S3 URL.
    Audio streams directly from S3 to browser — never passes through Lambda.
    """
    voice_id = voice_id or VOICE_ID
    clean = speakable_text(text)
    # Include voice + speed in the cache key so changing either invalidates old audio.
    key = audio_cache_key(f"v2|voice={voice_id}|s={VOICE_SPEED}|{clean}")

    if not audio_exists(key):
        audio = client.text_to_speech.convert(
            voice_id=voice_id,
            text=clean,
            model_id="eleven_turbo_v2",
            output_format="mp3_44100_128",
            voice_settings=VoiceSettings(
                stability=VOICE_STABILITY,
                similarity_boost=VOICE_SIMILARITY,
                speed=VOICE_SPEED,
            ),
        )
        audio_bytes = b"".join(chunk for chunk in audio)
        upload_audio(key, audio_bytes)

    return get_audio_presigned_url(key)
