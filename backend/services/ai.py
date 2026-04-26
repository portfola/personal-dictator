import os
from anthropic import AsyncAnthropic
from together import AsyncTogether
from dotenv import load_dotenv

load_dotenv()

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
) -> str:
    if provider == "anthropic":
        response = await anthropic_client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=max_tokens,
            system=system,
            messages=messages,
        )
        return response.content[0].text
    elif provider == "together":
        full_messages = [{"role": "system", "content": system}] + messages
        response = await together_client.chat.completions.create(
            model=TOGETHER_MODEL,
            messages=full_messages,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content
    else:
        raise ValueError(f"Unknown provider: {provider}")
