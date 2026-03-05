from __future__ import annotations

import json
import re
from html import unescape
from urllib.error import HTTPError, URLError
from urllib.parse import quote_plus
from urllib.request import Request, urlopen

from .models import SearchHit

USER_AGENT = "ai-agent-demo/1.0 (+https://github.com/)"


def web_search(query: str, max_results: int) -> list[SearchHit]:
    """Real web search via DuckDuckGo instant answer API."""
    url = (
        "https://api.duckduckgo.com/?q="
        f"{quote_plus(query)}&format=json&no_html=1&skip_disambig=1"
    )
    request = Request(url=url, headers={"User-Agent": USER_AGENT})

    try:
        with urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError) as exc:
        raise RuntimeError(f"web_search failed: {exc}") from exc

    hits: list[SearchHit] = []
    related = payload.get("RelatedTopics", [])
    for item in related:
        if "Topics" in item:
            for sub in item["Topics"]:
                if "FirstURL" in sub and "Text" in sub:
                    hits.append(
                        SearchHit(
                            title=sub["Text"].split(" - ")[0][:120],
                            url=sub["FirstURL"],
                            snippet=sub["Text"][:220],
                        )
                    )
        elif "FirstURL" in item and "Text" in item:
            hits.append(
                SearchHit(
                    title=item["Text"].split(" - ")[0][:120],
                    url=item["FirstURL"],
                    snippet=item["Text"][:220],
                )
            )
        if len(hits) >= max_results:
            break

    if not hits and payload.get("AbstractURL"):
        hits.append(
            SearchHit(
                title=payload.get("Heading") or query,
                url=payload["AbstractURL"],
                snippet=(payload.get("AbstractText") or "No summary available")[:220],
            )
        )

    return hits[:max_results]


def web_fetch(url: str, max_chars: int = 8000) -> str:
    """Real page fetch."""
    request = Request(url=url, headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(request, timeout=12) as response:
            return response.read(max_chars).decode("utf-8", errors="ignore")
    except (HTTPError, URLError, TimeoutError) as exc:
        raise RuntimeError(f"web_fetch failed for {url}: {exc}") from exc


def parse_html_to_text(raw_html: str) -> str:
    """Tool parser: strip HTML and keep readable text."""
    no_scripts = re.sub(r"<script.*?>.*?</script>", "", raw_html, flags=re.S | re.I)
    no_styles = re.sub(r"<style.*?>.*?</style>", "", no_scripts, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", no_styles)
    text = unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_key_points(text: str, limit: int = 4) -> list[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text)
    cleaned = [s.strip() for s in sentences if len(s.strip()) > 40]
    return cleaned[:limit] if cleaned else [text[:180]]


def build_markdown_report(query: str, key_findings: list[str], citations: list[str]) -> str:
    findings_md = (
        "\n".join(f"- {f}" for f in key_findings)
        if key_findings
        else "- No strong findings."
    )
    citations_md = (
        "\n".join(f"- {c}" for c in citations)
        if citations
        else "- No citations available"
    )

    return (
        f"# Research Brief\n\n"
        f"## Objective\n{query}\n\n"
        f"## Key Findings\n{findings_md}\n\n"
        f"## Sources\n{citations_md}\n"
    )
