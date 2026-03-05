from __future__ import annotations

from uuid import uuid4

from .models import ResearchRequest, SourceNote, ToolCall, WorkflowResult
from .tools import (
    build_markdown_report,
    extract_key_points,
    parse_html_to_text,
    web_fetch,
    web_search,
)


def run_research_workflow(req: ResearchRequest) -> WorkflowResult:
    workflow_id = f"wf_{uuid4().hex[:12]}"
    tool_calls: list[ToolCall] = []

    hits = web_search(req.query, req.max_results)
    tool_calls.append(
        ToolCall(
            name="web_search",
            input={"query": req.query, "max_results": req.max_results},
            output_preview=f"{len(hits)} results",
        )
    )

    source_notes: list[SourceNote] = []
    for hit in hits[: req.max_sources_to_read]:
        raw_html = web_fetch(str(hit.url))
        tool_calls.append(
            ToolCall(
                name="web_fetch",
                input={"url": str(hit.url)},
                output_preview=f"{len(raw_html)} chars",
            )
        )

        parsed = parse_html_to_text(raw_html)
        points = extract_key_points(parsed)
        tool_calls.append(
            ToolCall(
                name="parser",
                input={"url": str(hit.url)},
                output_preview="; ".join(points)[:180],
            )
        )

        source_notes.append(
            SourceNote(
                url=hit.url,
                title=hit.title,
                extracted_text=parsed[:700],
                key_points=points,
            )
        )

    findings = [point for note in source_notes for point in note.key_points][:8]
    citations = [f"{note.title} — {note.url}" for note in source_notes]
    report = build_markdown_report(req.query, findings, citations)
    tool_calls.append(
        ToolCall(
            name="report_builder",
            input={"query": req.query},
            output_preview=report[:180],
        )
    )

    return WorkflowResult(
        workflow_id=workflow_id,
        query=req.query,
        tool_calls=tool_calls,
        sources=source_notes,
        final_report_markdown=report,
    )
