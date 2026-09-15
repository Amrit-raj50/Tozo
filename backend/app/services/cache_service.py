"""SQLite Scan History & Cache Service

Stores historical analysis reports in a local SQLite database (tozo_cache.db)
to enable instant re-scan diffing, change tracking, and shareable scorecards.
"""

import sqlite3
import json
from pathlib import Path
from typing import Optional
from datetime import datetime, timezone
from ..config import DB_PATH, DATA_DIR


def _init_db() -> None:
    """Initialize the SQLite schema if it does not exist."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS scans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                repo_owner TEXT NOT NULL,
                repo_name TEXT NOT NULL,
                commit_sha TEXT NOT NULL,
                report_json TEXT NOT NULL,
                scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_repo_owner_name 
            ON scans(repo_owner, repo_name);
        """)
        conn.commit()


def get_cached_scan(owner: str, repo: str) -> Optional[dict]:
    """Retrieve the most recent scan report for a repository.

    Returns:
        Optional[dict]: {
            'report_json': str,
            'commit_sha': str,
            'scanned_at': str
        } or None if never scanned.
    """
    _init_db()
    owner_clean = owner.strip().lower()
    repo_clean = repo.strip().lower()

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT report_json, commit_sha, scanned_at 
            FROM scans 
            WHERE LOWER(repo_owner) = ? AND LOWER(repo_name) = ?
            ORDER BY id DESC 
            LIMIT 1;
        """, (owner_clean, repo_clean))
        row = cursor.fetchone()

        if row:
            return {
                "report_json": row[0],
                "commit_sha": row[1],
                "scanned_at": row[2],
            }

    return None


def save_scan(owner: str, repo: str, commit_sha: str, report_json: str) -> None:
    """Append a newly completed scan to the historical scans database."""
    _init_db()
    owner_clean = owner.strip().lower()
    repo_clean = repo.strip().lower()
    now_iso = datetime.now(timezone.utc).isoformat()

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO scans (repo_owner, repo_name, commit_sha, report_json, scanned_at)
            VALUES (?, ?, ?, ?, ?);
        """, (owner_clean, repo_clean, commit_sha, report_json, now_iso))
        conn.commit()
