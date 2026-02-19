import base64
import json
import logging

import anthropic
from openai import AsyncOpenAI

from config import ANTHROPIC_API_KEY, OPENAI_API_KEY

logger = logging.getLogger("miauriguard.llm")

_anthropic_client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None
_openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

# Thresholds for OpenAI moderation scores → our verdict mapping
_SEVERE_THRESHOLD = 0.7
_WARNING_THRESHOLD = 0.3

_SEVERE_CATEGORIES = {"hate", "hate/threatening", "violence", "harassment/threatening"}
_WARNING_CATEGORIES = {"harassment", "self-harm", "sexual/minors"}

_HAIKU_SYSTEM_PROMPT = """You are a content moderation assistant for a gaming community Discord server.
Analyze the provided image (and any accompanying text) for hate symbols (swastikas, SS bolts, white power signs, etc.), hate speech, threats of violence, or other harmful visual content.

Respond with ONLY a JSON object (no markdown, no code fences):
{"verdict": "safe|warning|severe", "reason": "brief explanation"}

Classification guide:
- "safe": Normal images, gaming screenshots, memes without hate
- "warning": Borderline offensive imagery, edgy memes that cross the line
- "severe": Explicit hate symbols, graphic violence, extreme offensive imagery

Be strict about hate symbols - these should always be "severe"."""


async def moderate_text(text: str) -> dict:
    """Analyze text using OpenAI's free Moderation API."""
    try:
        response = await _openai_client.moderations.create(input=text)
        result = response.results[0]
        scores = result.category_scores

        worst_verdict = "safe"
        worst_reason = ""
        worst_score = 0.0

        for category, score in vars(scores).items():
            if score < _WARNING_THRESHOLD:
                continue

            category_name = category.replace("_", "/")
            if score >= _SEVERE_THRESHOLD and category_name in _SEVERE_CATEGORIES:
                if score > worst_score or worst_verdict != "severe":
                    worst_verdict = "severe"
                    worst_reason = f"{category_name} ({score:.2f})"
                    worst_score = score
            elif worst_verdict != "severe":
                if score > worst_score:
                    worst_verdict = "warning"
                    worst_reason = f"{category_name} ({score:.2f})"
                    worst_score = score

        return {"verdict": worst_verdict, "reason": worst_reason or "clean content"}
    except Exception:
        logger.exception("OpenAI text moderation failed")
        return {"verdict": "safe", "reason": "moderation unavailable"}


async def moderate_image(image_data: bytes, media_type: str, text: str = "") -> dict:
    """Analyze image content using Claude Haiku vision."""
    b64 = base64.standard_b64encode(image_data).decode("utf-8")
    content: list[dict] = [
        {
            "type": "image",
            "source": {"type": "base64", "media_type": media_type, "data": b64},
        },
    ]
    if text:
        content.append({"type": "text", "text": f"Accompanying message text: {text}"})
    else:
        content.append({"type": "text", "text": "Analyze this image for hate symbols or harmful content."})

    if not _anthropic_client:
        logger.warning("Skipping image moderation — no Anthropic API key configured")
        return {"verdict": "safe", "reason": "image moderation disabled"}

    try:
        response = await _anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=150,
            system=_HAIKU_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": content}],
        )
        return _parse_haiku_response(response.content[0].text)
    except Exception:
        logger.exception("Haiku image moderation failed")
        return {"verdict": "safe", "reason": "moderation unavailable"}


def _parse_haiku_response(text: str) -> dict:
    """Parse Haiku JSON response, handling potential formatting issues."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

    try:
        result = json.loads(text)
        if result.get("verdict") not in ("safe", "warning", "severe"):
            result["verdict"] = "safe"
        return result
    except json.JSONDecodeError:
        logger.warning("Failed to parse Haiku response: %s", text)
        return {"verdict": "safe", "reason": "parse error"}
