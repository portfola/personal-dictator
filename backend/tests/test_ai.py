import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

@pytest.mark.asyncio
async def test_chat_anthropic_returns_string():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="Here is the summary.")]
    with patch("services.ai.anthropic_client") as mock_client:
        mock_client.messages.create = AsyncMock(return_value=mock_response)
        from services.ai import chat
        result = await chat(
            messages=[{"role": "user", "content": "Summarize this."}],
            provider="anthropic"
        )
    assert isinstance(result, str)
    assert len(result) > 0

@pytest.mark.asyncio
async def test_unknown_provider_raises():
    from services.ai import chat
    with pytest.raises(ValueError, match="Unknown provider"):
        await chat(messages=[], provider="openai")
