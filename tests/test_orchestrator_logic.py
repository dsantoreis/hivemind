from ai_agent_demo.models import ResearchRequest, SearchHit
from ai_agent_demo.orchestrator import run_research_workflow


def test_orchestrator_executes_full_toolchain(monkeypatch):
    def fake_search(query: str, max_results: int):
        assert query == "fastapi orchestration"
        assert max_results == 2
        return [
            SearchHit(title="A", url="https://example.com/a", snippet="a"),
            SearchHit(title="B", url="https://example.com/b", snippet="b"),
        ]

    def fake_fetch(url: str, max_chars: int = 8000):
        return (
            f"<html><body>{url} sentence one. "
            "sentence two with more than forty chars.</body></html>"
        )

    monkeypatch.setattr("ai_agent_demo.orchestrator.web_search", fake_search)
    monkeypatch.setattr("ai_agent_demo.orchestrator.web_fetch", fake_fetch)

    result = run_research_workflow(
        ResearchRequest(query="fastapi orchestration", max_results=2, max_sources_to_read=2)
    )

    assert result.workflow_id.startswith("wf_")
    assert len(result.sources) == 2
    assert {call.name for call in result.tool_calls} == {
        "web_search",
        "web_fetch",
        "parser",
        "report_builder",
    }
    assert "# Research Brief" in result.final_report_markdown
    assert "https://example.com/a" in result.final_report_markdown
