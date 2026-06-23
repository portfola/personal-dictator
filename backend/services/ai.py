import os
import time
import logging
from anthropic import AsyncAnthropic
from together import AsyncTogether
from dotenv import load_dotenv

load_dotenv()

log = logging.getLogger(__name__)

anthropic_client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY", "PLACEHOLDER"))
together_client = AsyncTogether(api_key=os.getenv("TOGETHER_API_KEY", "PLACEHOLDER"))

ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")
TOGETHER_MODEL = os.getenv("TOGETHER_MODEL", "meta-llama/Llama-3-70b-chat-hf")

SYSTEM_PROMPT = """You are a helpful document assistant called Personal Dictator.
You help users understand, summarize, and discuss their documents.
Be concise, clear, and conversational — as if narrating to someone who is listening, not reading."""

async def chat(
    messages: list[dict],
    system: str = SYSTEM_PROMPT,
    provider: str = "anthropic",
    max_tokens: int = 1024,
) -> tuple[str, dict]:
    """Return (reply_text, meta). `meta` carries provider/model/token-usage/latency
    so callers can surface and log it. Raises ValueError on an unknown provider."""
    if provider not in ("anthropic", "together"):
        raise ValueError(f"Unknown provider: {provider}")

    start = time.monotonic()
    try:
        if provider == "anthropic":
            response = await anthropic_client.messages.create(
                model=ANTHROPIC_MODEL,
                max_tokens=max_tokens,
                system=system,
                messages=messages,
            )
            text = response.content[0].text
            model = getattr(response, "model", ANTHROPIC_MODEL)
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens
        else:  # together
            full_messages = [{"role": "system", "content": system}] + messages
            response = await together_client.chat.completions.create(
                model=TOGETHER_MODEL,
                messages=full_messages,
                max_tokens=max_tokens,
            )
            text = response.choices[0].message.content
            model = getattr(response, "model", TOGETHER_MODEL)
            input_tokens = response.usage.prompt_tokens
            output_tokens = response.usage.completion_tokens
    except Exception:
        log.exception("chat failed (provider=%s)", provider)
        raise

    meta = {
        "provider": provider,
        "model": model,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "latency_ms": round((time.monotonic() - start) * 1000),
    }
    log.info(
        "chat ok provider=%s model=%s in=%s out=%s latency_ms=%s",
        provider, model, input_tokens, output_tokens, meta["latency_ms"],
    )
    return text, meta
