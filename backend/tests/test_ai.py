import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

@pytest.mark.asyncio
async def test_chat_anthropic_returns_text_and_meta():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="Here is the summary.")]
    mock_response.model = "claude-test"
    mock_response.usage = MagicMock(input_tokens=12, output_tokens=34)
    with patch("services.ai.anthropic_client") as mock_client:
        mock_client.messages.create = AsyncMock(return_value=mock_response)
        from services.ai import chat
        text, meta = await chat(
            messages=[{"role": "user", "content": "Summarize this."}],
            provider="anthropic"
        )
    assert isinstance(text, str) and len(text) > 0
    assert meta["provider"] == "anthropic"
    assert meta["model"] == "claude-test"
    assert meta["input_tokens"] == 12
    assert meta["output_tokens"] == 34
    assert "latency_ms" in meta

@pytest.mark.asyncio
async def test_unknown_provider_raises():
    from services.ai import chat
    with pytest.raises(ValueError, match="Unknown provider"):
        await chat(messages=[], provider="openai")
