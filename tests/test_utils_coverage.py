import logging

from ai_agent_demo.observability import JsonFormatter
from ai_agent_demo.security import mint_jwt, verify_jwt
from ai_agent_demo.tools import build_markdown_report, extract_key_points, parse_html_to_text


def test_security_jwt_roundtrip():
    token = mint_jwt("tester", ttl_seconds=30)
    claims = verify_jwt(token)
    assert claims["sub"] == "tester"


def test_tools_parsing_and_report():
    txt = parse_html_to_text("<html><body><h1>Hello</h1><script>x=1</script><p>World sentence long enough for extraction.</p></body></html>")
    points = extract_key_points(txt)
    report = build_markdown_report("q", points, ["source"])
    assert "Hello" in txt
    assert isinstance(points, list)
    assert "Research Brief" in report


def test_json_formatter():
    formatter = JsonFormatter()
    record = logging.LogRecord("x", logging.INFO, __file__, 10, "hello", args=(), exc_info=None)
    out = formatter.format(record)
    assert '"message": "hello"' in out
