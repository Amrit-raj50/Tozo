"""AI Code Analysis Service

Sends high-complexity code chunks concurrently to the configured AI API
using OpenAI-compatible async client with bounded semaphore concurrency.
Tailors prompts according to folder domain (backend vs. frontend vs. general).
"""

import json
import re
import asyncio
from typing import Optional
from pathlib import Path
from openai import AsyncOpenAI
from ..config import (
    get_ai_base_url,
    get_ai_model,
    MAX_AI_CHUNKS,
    AI_CONCURRENCY_LIMIT,
    is_ai_available,
    get_api_key,
)
from ..models.report_models import Issue
from .ast_shared_service import CodeChunk

BACKEND_SYSTEM_PROMPT = """You are an expert backend engineer and security auditor.
Analyze the provided backend code chunk for:
1. Logic bugs or edge-case crashes (category="bug")
2. Error handling flaws, unhandled exceptions, or swallowed errors (category="error_handling")
3. Backend flaws: bad database queries, missing parameter validation, or resource leaks (category="backend")
4. Performance bottlenecks, blocking I/O, or high algorithmic complexity (category="enhancement")

IMPORTANT RULES:
- Output MUST be strictly valid JSON.
- Format:
{
  "issues": [
    {
      "category": "bug" | "error_handling" | "backend" | "enhancement",
      "severity": "high" | "medium" | "low",
      "line_start": <number>,
      "line_end": <number>,
      "function_name": "<name of function or class>",
      "description": "<concise explanation of flaw>",
      "suggested_fix": "<actionable code fix or recommendation>"
    }
  ]
}
- If no significant issues exist, return {"issues": []}.
- Do NOT hallucinate nitpicks. Only flag real issues.
"""

FRONTEND_SYSTEM_PROMPT = """You are an expert frontend engineer and accessibility auditor.
Analyze the provided frontend code chunk for:
1. Rendering bugs, broken state logic, or undefined access (category="bug")
2. Error handling flaws, missing fallback UI, or unhandled promise rejections (category="error_handling")
3. Frontend flaws: unnecessary re-renders, missing keys in lists, prop drilling, or accessibility issues (category="frontend")
4. Performance bottlenecks, large bundle imports, or memory leaks in hooks (category="enhancement")

IMPORTANT RULES:
- Output MUST be strictly valid JSON.
- Format:
{
  "issues": [
    {
      "category": "bug" | "error_handling" | "frontend" | "enhancement",
      "severity": "high" | "medium" | "low",
      "line_start": <number>,
      "line_end": <number>,
      "function_name": "<name of component or function>",
      "description": "<concise explanation of flaw>",
      "suggested_fix": "<actionable code fix or recommendation>"
    }
  ]
}
- If no significant issues exist, return {"issues": []}.
- Do NOT hallucinate nitpicks. Only flag real issues.
"""

GENERAL_SYSTEM_PROMPT = """You are an expert software engineer and code reviewer.
Analyze the provided code chunk for:
1. Bugs, logic flaws, or type mismatches (category="bug")
2. Error handling flaws or unhandled failure states (category="error_handling")
3. Backend or frontend architectural issues (category="backend" or "frontend")
4. Performance bottlenecks or enhancement opportunities (category="enhancement")

IMPORTANT RULES:
- Output MUST be strictly valid JSON.
- Format:
{
  "issues": [
    {
      "category": "bug" | "error_handling" | "backend" | "frontend" | "enhancement",
      "severity": "high" | "medium" | "low",
      "line_start": <number>,
      "line_end": <number>,
      "function_name": "<name of function>",
      "description": "<concise explanation of flaw>",
      "suggested_fix": "<actionable code fix or recommendation>"
    }
  ]
}
- If no significant issues exist, return {"issues": []}.
- Do NOT hallucinate nitpicks. Only flag real issues.
"""


def extract_json(raw_text: str) -> Optional[dict]:
    """Extract and parse JSON object from AI completion."""
    text = raw_text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            pass

    return None


async def analyze_single_chunk(
    client: AsyncOpenAI,
    chunk: CodeChunk,
    semaphore: asyncio.Semaphore,
) -> list[Issue]:
    """Analyze a single code chunk using AI with domain-specific instructions."""
    # Choose system prompt based on domain
    if chunk.folder_tag == "backend":
        system_prompt = BACKEND_SYSTEM_PROMPT
    elif chunk.folder_tag == "frontend":
        system_prompt = FRONTEND_SYSTEM_PROMPT
    else:
        system_prompt = GENERAL_SYSTEM_PROMPT

    user_prompt = (
        f"File: {chunk.file_path} (Lines {chunk.start_line}-{chunk.end_line})\n"
        f"Language: {chunk.language} | Domain: {chunk.folder_tag}\n"
        f"Code ({chunk.chunk_type} '{chunk.name}'):\n"
        f"```\n{chunk.code}\n```"
    )

    filename = Path(chunk.file_path).name
    folder_path = "/".join(chunk.file_path.split("/")[:-1]) if "/" in chunk.file_path else ""

    async with semaphore:
        for attempt in range(2):
            try:
                response = await client.chat.completions.create(
                    model=get_ai_model(),
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.1,
                    max_tokens=1500,
                    timeout=30.0,
                )

                raw_content = response.choices[0].message.content or ""
                parsed = extract_json(raw_content)

                if not parsed or "issues" not in parsed:
                    if attempt == 0:
                        continue
                    return []

                results: list[Issue] = []
                for item in parsed.get("issues", []):
                    rel_start = item.get("line_start") or item.get("line") or 1
                    rel_end = item.get("line_end") or rel_start

                    # Offset line numbers if AI returned relative line numbers (1..N within snippet)
                    if rel_start < chunk.start_line:
                        abs_start = chunk.start_line + rel_start - 1
                    else:
                        abs_start = min(rel_start, chunk.end_line)

                    if rel_end < chunk.start_line:
                        abs_end = chunk.start_line + rel_end - 1
                    else:
                        abs_end = min(rel_end, chunk.end_line)

                    category = (item.get("category") or item.get("type") or "bug").lower()
                    # Normalize category to canonical taxonomy
                    if category not in {
                        "bug", "error_handling", "backend", "frontend",
                        "lint", "typo", "cicd", "deployment", "documentation",
                        "enhancement", "test_coverage"
                    }:
                        if category == "performance":
                            category = "backend" if chunk.folder_tag == "backend" else "frontend"
                        elif category == "security":
                            category = "backend"
                        else:
                            category = "bug"

                    severity = item.get("severity", "medium").lower()
                    if severity not in {"high", "medium", "low"}:
                        severity = "medium"

                    func_name = item.get("function_name") or chunk.name

                    results.append(
                        Issue(
                            category=category,
                            severity=severity,
                            file=filename,
                            folder=folder_path,
                            full_path=chunk.file_path,
                            line_start=abs_start,
                            line_end=abs_end,
                            function_name=func_name,
                            description=item.get("description", "Potential issue identified by AI."),
                            suggested_fix=item.get("suggested_fix"),
                            source="ai",
                            rule_id="AI_VERIFIED",
                        )
                    )
                return results

            except Exception:
                if attempt == 1:
                    return []
                await asyncio.sleep(0.5)

    return []


async def analyze_chunks_with_ai(chunks: list[CodeChunk]) -> list[Issue]:
    """Analyze code chunks concurrently with configured AI engine."""
    if not is_ai_available():
        return []

    # Sort chunks by cyclomatic complexity descending
    sorted_chunks = sorted(
        chunks,
        key=lambda c: (c.complexity, len(c.code)),
        reverse=True,
    )

    # Always take at least the top 10 (or all if < 10), capped at MAX_AI_CHUNKS (15)
    selected_count = min(max(10, len(sorted_chunks)), MAX_AI_CHUNKS, len(sorted_chunks))
    selected_chunks = sorted_chunks[:selected_count]

    client = AsyncOpenAI(
        api_key=get_api_key(),
        base_url=get_ai_base_url(),
    )

    semaphore = asyncio.Semaphore(AI_CONCURRENCY_LIMIT)

    tasks = [
        analyze_single_chunk(client, chunk, semaphore)
        for chunk in selected_chunks
    ]

    nested_issues = await asyncio.gather(*tasks, return_exceptions=True)

    all_ai_issues: list[Issue] = []
    for result in nested_issues:
        if isinstance(result, list):
            all_ai_issues.extend(result)

    return all_ai_issues
