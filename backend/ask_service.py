import os

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

SYSTEM_PROMPT = """You are Mayar Waleed Nawas's AI CV assistant. You help people learn about Mayar and answer interview-style questions about him. Answer only from the CV context provided. Be concise, professional, and interview-ready.

Interview awareness:
- Treat questions as if someone is preparing to interview Mayar or is interviewing him. Give answers that would work in a real interview: clear, structured, and grounded in his experience.
- "Tell me about yourself" / "Introduce Mayar" → Short summary: who he is (role, background), key experience, and what he focuses on (e.g. full-stack, AI, front-end). Mention education and current work.
- "Strengths" / "Why hire him" → Draw from his skills, projects, and experience: e.g. full-stack + AI, real products shipped, technologies, collaboration.
- "Experience" / "Background" → Use his roles, companies, dates, and descriptions. Include impact and technologies where available.
- "Projects" / "What has he built" → Name projects with URLs, short description, and tech or role. Always include the full URL for each project.
- "Challenging project" / "Biggest achievement" / "Describe a time when" → Pick the most relevant project or role from context and frame it with problem, what he did, and outcome.
- "Skills" / "Tech stack" / "Technologies" → Use the skills section; group by area (front-end, backend, AI, etc.) and use commas, not one per line.
- "Education" / "Degree" / "Where did he study" → Use education from context (degree, institution, graduation year, boot camp).
- "Contact" / "How to reach" / "Email" / "LinkedIn" → Give the exact link or email from context; include full URLs.
- If the user refers to something from the previous message (e.g. "that project", "there", "his role at X"), use the recent conversation to understand what they mean and answer accordingly.
- If something is not in the context, say so briefly and offer what you can answer from his CV.

Format (Markdown):
- Use **bold** for names (projects, companies, roles).
- Use ## for main sections and ### for sub-sections when listing several items.
- Use bullet points (- or *) for key points; keep each project/role in its own block with a heading, then bullets.
- Keep answers scannable: short lines and bullets, not long paragraphs.
- Skills/technologies: comma-separated only, e.g. **Frontend:** React, Next.js, TypeScript. Never one skill per line.

Links: Whenever you mention something that has a URL in the context (projects, GitHub, LinkedIn), always include the full URL (e.g. https://...) in your answer so the user can click it."""


def build_context(data: dict) -> str:
    """Build a single text block from db_store for the LLM context."""
    parts = []

    profile = data.get("profile") or {}
    if profile:
        parts.append("## Profile")
        parts.append(f"Name: {profile.get('name', '')}")
        parts.append(f"Job title: {profile.get('jobTitle', '')}")
        contact = profile.get("contact") or {}
        if contact:
            parts.append(f"Email: {contact.get('email', '')}")
            parts.append(f"Phone: {contact.get('phone', '')}")
        links = profile.get("links") or {}
        if links:
            parts.append(f"GitHub: {links.get('github', '')}")
            parts.append(f"LinkedIn: {links.get('linkedin', '')}")
        parts.append("")

    experience = data.get("experience") or []
    if experience:
        parts.append("## Experience")
        for job in experience:
            parts.append(f"- {job.get('role', '')} at {job.get('company', 'N/A')} ({job.get('dates', '')})")
            parts.append(f"  {job.get('description', '')}")
        parts.append("")

    projects = data.get("projects") or []
    if projects:
        parts.append("## Projects")
        for p in projects:
            parts.append(f"- {p.get('name', '')} ({p.get('url', '')})")
            parts.append(f"  {p.get('description', '')}")
        parts.append("")

    education = data.get("education") or []
    if education:
        parts.append("## Education")
        for e in education:
            line = e.get("degree") or e.get("program") or ""
            if e.get("institution"):
                line += f" - {e['institution']}"
            if e.get("graduationYear") or e.get("dates"):
                line += f" ({e.get('graduationYear') or e.get('dates')})"
            parts.append(f"- {line}")
            if e.get("description"):
                parts.append(f"  {e['description']}")
        parts.append("")

    skills = data.get("skills") or {}
    if skills and isinstance(skills, dict):
        parts.append("## Skills")
        for key, value in skills.items():
            if key == "notes" or not value:
                continue
            if isinstance(value, list):
                parts.append(f"{key}: {', '.join(str(v) for v in value)}")
            else:
                parts.append(f"{key}: {value}")
        if skills.get("notes"):
            parts.append(f"Notes: {skills['notes']}")

    return "\n".join(parts).strip()


def _collapse_skill_lines(text: str) -> str:
    """Merge runs of one-item-per-line (e.g. skills) into comma-separated lines."""
    lines = text.split("\n")
    out: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        # Section header (e.g. "Technical Skills", "Frontend"): keep as own line, don't merge
        if stripped and " " in stripped and len(stripped) < 45 and not stripped.startswith(("-", "*", "#")):
            out.append(line)
            i += 1
            continue
        # Short line, no comma, not a bullet/header: might be start of a skill list
        looks_like_single_item = (
            stripped
            and not stripped.startswith("-")
            and not stripped.startswith("*")
            and not stripped.startswith("#")
            and "," not in stripped
            and len(stripped) < 55
        )
        if looks_like_single_item:
            run = [stripped]
            j = i + 1
            while j < len(lines):
                next_ln = lines[j].strip()
                if not next_ln or next_ln.startswith("#") or next_ln.startswith("-") or next_ln.startswith("*"):
                    break
                if "," in next_ln or len(next_ln) > 55:
                    break
                run.append(next_ln)
                j += 1
            if len(run) >= 3:
                out.append(", ".join(run))
                i = j
                continue
        out.append(line)
        i += 1
    return "\n".join(out)


def answer_question(question: str, data: dict, history: list[dict] | None = None) -> str:
    """Answer a question about the CV using Groq. Optional history for follow-up questions."""
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key or not api_key.strip():
        raise ValueError("GROQ_API_KEY is not set. Add it to backend/.env")

    context = build_context(data)
    if not context:
        return "No CV data available to answer from."

    client = Groq(api_key=api_key)
    parts = [f"CV context:\n{context}", "\n"]
    if history:
        parts.append("Recent conversation:\n")
        for msg in history[-6:]:  # last 3 exchanges max
            role = (msg.get("role") or "user").lower()
            content = (msg.get("content") or "").strip()
            if content:
                label = "Assistant" if role == "assistant" else "User"
                parts.append(f"{label}: {content}\n")
        parts.append("\n")
    parts.append(f"Current question: {question.strip()}")

    user_content = "".join(parts)

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        max_tokens=1024,
        temperature=0.3,
    )
    choice = response.choices[0] if response.choices else None
    if not choice or not getattr(choice, "message", None):
        raise ValueError("Empty response from Groq")
    raw = (choice.message.content or "").strip()
    return _collapse_skill_lines(raw)
