import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from services.parser import parse_sections

def test_parse_sections_by_heading():
    md = "# Intro\nHello world.\n## Part One\nSome content.\n## Part Two\nMore content."
    sections = parse_sections(md)
    assert len(sections) == 3
    assert sections[0]["title"] == "Intro"
    assert sections[1]["title"] == "Part One"
    assert "Some content" in sections[1]["text"]

def test_parse_no_headings():
    sections = parse_sections("Just plain text with no headings.")
    assert len(sections) == 1
    assert sections[0]["title"] == "Document"
