from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl, field_validator


class ResearchRequest(BaseModel):
    query: str = Field(min_length=5, description="Research objective")
    max_results: int = Field(default=5, ge=1, le=10)
    max_sources_to_read: int = Field(default=3, ge=1, le=5)

    @field_validator("query", mode="before")
    @classmethod
    def normalize_query(cls, value: str) -> str:
        if isinstance(value, str):
            return " ".join(value.split())
        return value


class SearchHit(BaseModel):
    title: str
    url: HttpUrl
    snippet: str


class SourceNote(BaseModel):
    url: HttpUrl
    title: str
    extracted_text: str
    key_points: list[str]


class ToolCall(BaseModel):
    name: Literal["web_search", "web_fetch", "parser", "report_builder"]
    input: dict
    output_preview: str


class WorkflowResult(BaseModel):
    workflow_id: str
    query: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    tool_calls: list[ToolCall]
    sources: list[SourceNote]
    final_report_markdown: str
