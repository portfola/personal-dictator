import os
from elevenlabs.client import ElevenLabs
from services.storage import audio_cache_key, audio_exists, upload_audio, get_audio_presigned_url
from dotenv import load_dotenv

load_dotenv()

client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))
VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")

def synthesize_to_url(text: str) -> str:
    """
    Synthesize text to speech. Returns a presigned S3 URL.
    Audio streams directly from S3 to browser — never passes through Lambda.
    """
    key = audio_cache_key(text)

    if not audio_exists(key):
        audio = client.text_to_speech.convert(
            voice_id=VOICE_ID,
            text=text,
            model_id="eleven_turbo_v2",
            output_format="mp3_44100_128",
        )
        audio_bytes = b"".join(chunk for chunk in audio)
        upload_audio(key, audio_bytes)

    return get_audio_presigned_url(key)
