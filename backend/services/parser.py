import re

def parse_sections(content: str) -> list[dict]:
    lines = content.split("\n")
    sections, current = [], {"title": None, "text": []}
    heading_re = re.compile(r"^(#{1,3})\s+(.+)$")

    for line in lines:
        match = heading_re.match(line)
        if match:
            if current["text"] or current["title"]:
                sections.append({
                    "index": len(sections),
                    "title": current["title"] or "Document",
                    "text": "\n".join(current["text"]).strip(),
                })
            current = {"title": match.group(2), "text": []}
        else:
            current["text"].append(line)

    sections.append({
        "index": len(sections),
        "title": current["title"] or "Document",
        "text": "\n".join(current["text"]).strip(),
    })
    return [s for s in sections if s["text"]]
