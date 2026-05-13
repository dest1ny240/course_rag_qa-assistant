import os
import html
import json
import shutil
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from backend.database import DEFAULT_USERS, get_db, init_db, now_iso, row_to_dict
from backend.rag_chain import build_chain

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

qa_chains = {}
UPLOAD_ROOT = Path("source")


@app.on_event("startup")
def startup():
    init_db()


class Question(BaseModel):
    question: str
    course_id: str | None = None
    session_id: str | None = None
    user_id: int | None = None


class LoginRequest(BaseModel):
    email: str


class CourseCreate(BaseModel):
    id: str
    name: str
    short_name: str
    description: str
    created_by_user_id: int | None = None


class SessionCreate(BaseModel):
    id: str
    user_id: int
    course_id: str
    title: str = "New conversation"


class NoteUpsert(BaseModel):
    user_id: int
    course_id: str
    file_id: int | None = None
    title: str
    content: str


def format_sources(documents):
    sources = []

    for document in documents:
        metadata = document.metadata or {}
        source_path = metadata.get("source", "Unknown source")
        page = metadata.get("page")

        sources.append(
            {
                "source": os.path.basename(source_path),
                "page": page + 1 if isinstance(page, int) else page,
                "content": document.page_content[:360],
            }
        )

    return sources


def get_chain(course_id, force_api=False):
    selected_course_id = course_id or "software-engineering"
    cache_key = (selected_course_id, "api" if force_api else "auto")

    if cache_key not in qa_chains:
        qa_chain, llm_mode = build_chain(selected_course_id, force_api=force_api)
        qa_chains[cache_key] = {
            "chain": qa_chain,
            "llm_mode": llm_mode,
        }

    return qa_chains[cache_key]


def course_to_response(row):
    course = row_to_dict(row)
    if not course:
        return None

    return {
        "id": course["id"],
        "name": course["name"],
        "shortName": course["short_name"],
        "description": course["description"],
    }


def session_to_response(row, messages=None):
    session = row_to_dict(row)
    if not session:
        return None

    return {
        "id": session["id"],
        "courseId": session["course_id"],
        "title": session["title"],
        "preview": session["preview"],
        "updatedAt": session["updated_at"],
        "messages": messages if messages is not None else [],
    }


def message_to_response(row):
    message = row_to_dict(row)
    sources_json = message.get("sources_json")

    return {
        "role": message["role"],
        "content": message["content"],
        "sources": json.loads(sources_json) if sources_json else [],
        "llmMode": message.get("llm_mode"),
    }


def ensure_session(db, session_id, user_id, course_id, title="New conversation"):
    session = db.execute(
        "SELECT * FROM chat_sessions WHERE id = ?",
        (session_id,),
    ).fetchone()

    if session:
        return session

    timestamp = now_iso()
    db.execute(
        """
        INSERT INTO chat_sessions
            (id, user_id, course_id, title, preview, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (session_id, user_id, course_id, title, "No messages yet", timestamp, timestamp),
    )
    return db.execute("SELECT * FROM chat_sessions WHERE id = ?", (session_id,)).fetchone()


@app.post("/login")
def login(payload: LoginRequest):
    email = payload.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")

    allowed_emails = {account_email for account_email, _ in DEFAULT_USERS}
    if email not in allowed_emails:
        raise HTTPException(
            status_code=403,
            detail="Only authorized HEBUT accounts can sign in.",
        )

    with get_db() as db:
        user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()

    if not user:
        raise HTTPException(status_code=403, detail="Account is not initialized.")

    return row_to_dict(user)


@app.get("/login/accounts")
def list_login_accounts():
    init_db()

    with get_db() as db:
        rows = db.execute(
            """
            SELECT email, display_name
            FROM users
            WHERE email IN (?, ?, ?)
            ORDER BY id
            """,
            [email for email, _ in DEFAULT_USERS],
        ).fetchall()

    return [row_to_dict(row) for row in rows]


@app.get("/courses")
def list_courses():
    with get_db() as db:
        rows = db.execute(
            """
            SELECT * FROM courses
            ORDER BY
                CASE id
                    WHEN 'software-engineering' THEN 1
                    WHEN 'data-structures-and-algorithms' THEN 2
                    WHEN 'product-service-development' THEN 3
                    ELSE 4
                END,
                created_at,
                name
            """
        ).fetchall()

    return [course_to_response(row) for row in rows]


@app.post("/courses")
def create_course(course: CourseCreate):
    with get_db() as db:
        db.execute(
            """
            INSERT INTO courses (id, name, short_name, description, created_by_user_id)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                course.id,
                course.name,
                course.short_name,
                course.description,
                course.created_by_user_id,
            ),
        )
        row = db.execute("SELECT * FROM courses WHERE id = ?", (course.id,)).fetchone()

    return course_to_response(row)


@app.get("/courses/{course_id}/files")
def list_course_files(course_id: str):
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM course_files WHERE course_id = ? ORDER BY uploaded_at DESC",
            (course_id,),
        ).fetchall()

    return [row_to_dict(row) for row in rows]


@app.post("/courses/{course_id}/files")
def upload_course_file(
    course_id: str,
    uploaded_by_user_id: int | None = None,
    file: UploadFile = File(...),
):
    with get_db() as db:
        course = db.execute("SELECT id FROM courses WHERE id = ?", (course_id,)).fetchone()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found.")

    course_dir = UPLOAD_ROOT / course_id
    course_dir.mkdir(parents=True, exist_ok=True)

    safe_name = Path(file.filename or "course-file").name
    stored_path = course_dir / safe_name
    counter = 1
    while stored_path.exists():
        stored_path = course_dir / f"{Path(safe_name).stem}-{counter}{Path(safe_name).suffix}"
        counter += 1

    with stored_path.open("wb") as output:
        shutil.copyfileobj(file.file, output)

    with get_db() as db:
        db.execute(
            """
            INSERT INTO course_files
                (course_id, original_name, stored_path, content_type, size_bytes, uploaded_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                course_id,
                safe_name,
                str(stored_path),
                file.content_type or "application/octet-stream",
                stored_path.stat().st_size,
                uploaded_by_user_id,
            ),
        )
        row = db.execute(
            "SELECT * FROM course_files WHERE id = last_insert_rowid()"
        ).fetchone()

    return row_to_dict(row)


@app.get("/files/{file_id}/preview")
def preview_file(file_id: int):
    with get_db() as db:
        row = db.execute("SELECT * FROM course_files WHERE id = ?", (file_id,)).fetchone()

    file_record = row_to_dict(row)
    if not file_record or not Path(file_record["stored_path"]).exists():
        raise HTTPException(status_code=404, detail="File not found.")

    return FileResponse(
        file_record["stored_path"],
        media_type=file_record["content_type"],
        filename=file_record["original_name"],
    )


@app.get("/chat/sessions")
def list_chat_sessions(user_id: int, limit: int | None = None):
    sql = "SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC"
    params = [user_id]
    if limit:
        sql += " LIMIT ?"
        params.append(limit)

    with get_db() as db:
        rows = db.execute(sql, params).fetchall()

    return [session_to_response(row) for row in rows]


@app.post("/chat/sessions")
def create_chat_session(payload: SessionCreate):
    with get_db() as db:
        row = ensure_session(
            db,
            payload.id,
            payload.user_id,
            payload.course_id,
            payload.title,
        )

    return session_to_response(row)


@app.get("/chat/sessions/{session_id}/messages")
def list_chat_messages(session_id: str):
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at, id",
            (session_id,),
        ).fetchall()

    return [message_to_response(row) for row in rows]


@app.get("/notes")
def list_notes(user_id: int, course_id: str | None = None):
    sql = "SELECT * FROM notes WHERE user_id = ?"
    params = [user_id]
    if course_id:
        sql += " AND course_id = ?"
        params.append(course_id)
    sql += " ORDER BY updated_at DESC"

    with get_db() as db:
        rows = db.execute(sql, params).fetchall()

    return [row_to_dict(row) for row in rows]


@app.post("/notes")
def create_note(note: NoteUpsert):
    timestamp = now_iso()
    with get_db() as db:
        db.execute(
            """
            INSERT INTO notes
                (user_id, course_id, file_id, title, content, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                note.user_id,
                note.course_id,
                note.file_id,
                note.title,
                note.content,
                timestamp,
                timestamp,
            ),
        )
        row = db.execute("SELECT * FROM notes WHERE id = last_insert_rowid()").fetchone()

    return row_to_dict(row)


@app.get("/notes/{note_id}/export")
def export_note(note_id: int):
    with get_db() as db:
        note = db.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()

    note_data = row_to_dict(note)
    if not note_data:
        raise HTTPException(status_code=404, detail="Note not found.")

    title = html.escape(note_data["title"])
    content = html.escape(note_data["content"])
    html_content = f"""
    <!doctype html>
    <html>
      <head>
        <title>{title}</title>
        <style>
          body {{ font-family: Arial, sans-serif; color: #111827; margin: 48px; }}
          h1 {{ font-size: 28px; }}
          pre {{ white-space: pre-wrap; line-height: 1.6; font-family: inherit; }}
        </style>
      </head>
      <body>
        <h1>{title}</h1>
        <pre>{content}</pre>
        <script>window.print();</script>
      </body>
    </html>
    """
    return HTMLResponse(html_content)


@app.post("/chat")
def chat(q: Question):

    chain_entry = get_chain(q.course_id)

    try:
        result = chain_entry["chain"].invoke({"query": q.question})
    except Exception:
        if chain_entry["llm_mode"] != "local":
            raise

        chain_entry = get_chain(q.course_id, force_api=True)
        result = chain_entry["chain"].invoke({"query": q.question})

    response = {
        "answer": result["result"],
        "sources": format_sources(result.get("source_documents", [])),
        "llm_mode": chain_entry["llm_mode"],
    }

    if q.session_id and q.user_id:
        course_id = q.course_id or "software-engineering"
        timestamp = now_iso()
        with get_db() as db:
            session = ensure_session(db, q.session_id, q.user_id, course_id)
            first_user_message = db.execute(
                """
                SELECT content FROM chat_messages
                WHERE session_id = ? AND role = 'user'
                ORDER BY created_at, id LIMIT 1
                """,
                (q.session_id,),
            ).fetchone()

            db.execute(
                """
                INSERT INTO chat_messages (session_id, role, content, created_at)
                VALUES (?, 'user', ?, ?)
                """,
                (q.session_id, q.question, timestamp),
            )
            db.execute(
                """
                INSERT INTO chat_messages
                    (session_id, role, content, sources_json, llm_mode, created_at)
                VALUES (?, 'assistant', ?, ?, ?, ?)
                """,
                (
                    q.session_id,
                    response["answer"],
                    json.dumps(response["sources"]),
                    response["llm_mode"],
                    timestamp,
                ),
            )

            title = (
                first_user_message["content"][:28]
                if first_user_message
                else q.question[:28]
            )
            db.execute(
                """
                UPDATE chat_sessions
                SET title = ?, preview = ?, updated_at = ?
                WHERE id = ?
                """,
                (title, response["answer"][:52], timestamp, session["id"]),
            )

    return response
