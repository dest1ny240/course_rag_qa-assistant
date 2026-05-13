import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone


DATABASE_PATH = os.getenv("DATABASE_PATH", os.path.join("backend", "hebut_rag.db"))

DEFAULT_USERS = [
    ("li.minghao@hebut.edu.cn", "Li Minghao"),
    ("wang.yuxuan@hebut.edu.cn", "Wang Yuxuan"),
    ("zhao.ruilin@hebut.edu.cn", "Zhao Ruilin"),
]

DEFAULT_COURSES = [
    (
        "software-engineering",
        "Software Engineering",
        "SE",
        "Lecture slides, course notes, and review materials.",
    ),
    (
        "data-structures-and-algorithms",
        "Data Structures and Algorithms",
        "DSA",
        "Arrays, linked lists, trees, graphs, sorting, searching, and algorithm analysis.",
    ),
    (
        "product-service-development",
        "Product and Service Development",
        "PSD",
        "Product lifecycle, opportunities, concepts, refinement, and service development.",
    ),
]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def get_db():
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")

    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def row_to_dict(row):
    return dict(row) if row is not None else None


def init_db():
    with get_db() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                display_name TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS courses (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                short_name TEXT NOT NULL,
                description TEXT NOT NULL,
                created_by_user_id INTEGER,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by_user_id) REFERENCES users(id)
                    ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS course_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                course_id TEXT NOT NULL,
                original_name TEXT NOT NULL,
                stored_path TEXT NOT NULL,
                content_type TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                uploaded_by_user_id INTEGER,
                uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (course_id) REFERENCES courses(id)
                    ON DELETE CASCADE,
                FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
                    ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS chat_sessions (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                course_id TEXT NOT NULL,
                title TEXT NOT NULL,
                preview TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
                    ON DELETE CASCADE,
                FOREIGN KEY (course_id) REFERENCES courses(id)
                    ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                content TEXT NOT NULL,
                sources_json TEXT,
                llm_mode TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
                    ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                course_id TEXT NOT NULL,
                file_id INTEGER,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
                    ON DELETE CASCADE,
                FOREIGN KEY (course_id) REFERENCES courses(id)
                    ON DELETE CASCADE,
                FOREIGN KEY (file_id) REFERENCES course_files(id)
                    ON DELETE SET NULL
            );
            """
        )

        db.executemany(
            """
            INSERT INTO users (email, display_name)
            VALUES (?, ?)
            ON CONFLICT(email) DO UPDATE SET display_name = excluded.display_name
            """,
            DEFAULT_USERS,
        )

        db.executemany(
            """
            INSERT OR IGNORE INTO courses (id, name, short_name, description)
            VALUES (?, ?, ?, ?)
            """,
            DEFAULT_COURSES,
        )
