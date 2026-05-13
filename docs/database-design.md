# Database Design

The system uses SQLite for local development. The database stores the complete
history for authorized login users, courses, course files, chat sessions, chat
messages, and notes. The browser keeps only the latest three chat sessions as a
short-term cache for fast recovery.

The `users` table is also the login whitelist. The application seeds three
HEBUT demo accounts into this table, and `/login` only succeeds when the
submitted email already exists in that authorized account set.

## Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ COURSES : "creates courses"
    USERS ||--o{ COURSE_FILES : "uploads files"
    USERS ||--o{ CHAT_SESSIONS : "owns history"
    USERS ||--o{ NOTES : "writes notes"
    COURSES ||--o{ COURSE_FILES : contains
    COURSES ||--o{ CHAT_SESSIONS : scopes
    COURSES ||--o{ NOTES : organizes
    COURSE_FILES ||--o{ NOTES : anchors
    CHAT_SESSIONS ||--o{ CHAT_MESSAGES : contains

    USERS {
        INTEGER id PK
        TEXT email UK
        TEXT display_name
        TEXT created_at
    }

    COURSES {
        TEXT id PK
        TEXT name
        TEXT short_name
        TEXT description
        INTEGER created_by_user_id FK
        TEXT created_at
    }

    COURSE_FILES {
        INTEGER id PK
        TEXT course_id FK
        TEXT original_name
        TEXT stored_path
        TEXT content_type
        INTEGER size_bytes
        INTEGER uploaded_by_user_id FK
        TEXT uploaded_at
    }

    CHAT_SESSIONS {
        TEXT id PK
        INTEGER user_id FK
        TEXT course_id FK
        TEXT title
        TEXT preview
        TEXT created_at
        TEXT updated_at
    }

    CHAT_MESSAGES {
        INTEGER id PK
        TEXT session_id FK
        TEXT role
        TEXT content
        TEXT sources_json
        TEXT llm_mode
        TEXT created_at
    }

    NOTES {
        INTEGER id PK
        INTEGER user_id FK
        TEXT course_id FK
        INTEGER file_id FK
        TEXT title
        TEXT content
        TEXT created_at
        TEXT updated_at
    }
```

## Login Account Constraint

```mermaid
flowchart LR
    LOGIN["Login request<br/>email"] --> CHECK{"Email exists in<br/>users.email?"}
    USERS_DB[("users<br/>authorized HEBUT accounts")]
    USERS_DB --> CHECK
    CHECK -->|Yes| ALLOW["Allow sign in<br/>return user profile"]
    CHECK -->|No| REJECT["Reject sign in<br/>403 Forbidden"]
```

## Table Constraints

| Table | Primary Key | Foreign Keys | Notes |
| --- | --- | --- | --- |
| `users` | `id` | None | Authorized login accounts only; `email` is unique |
| `courses` | `id` | `created_by_user_id -> users.id` | User-created courses are optional in addition to seeded courses |
| `course_files` | `id` | `course_id -> courses.id`, `uploaded_by_user_id -> users.id` | Uploaded courseware and preview source files |
| `chat_sessions` | `id` | `user_id -> users.id`, `course_id -> courses.id` | Complete database chat history |
| `chat_messages` | `id` | `session_id -> chat_sessions.id` | Ordered messages in one session |
| `notes` | `id` | `user_id -> users.id`, `course_id -> courses.id`, `file_id -> course_files.id` | Notes can optionally attach to one course file |

## Seed Login Accounts

Only these initialized HEBUT demo accounts can sign in:

| Email | Display Name |
| --- | --- |
| `li.minghao@hebut.edu.cn` | Li Minghao |
| `wang.yuxuan@hebut.edu.cn` | Wang Yuxuan |
| `zhao.ruilin@hebut.edu.cn` | Zhao Ruilin |

## Relationship Notes

- A user can create many courses, upload many files, own many chat sessions,
  and write many notes.
- A course can contain many files, chat sessions, and notes.
- A chat session contains many chat messages.
- A note belongs to one user and one course, and can optionally reference one
  course file.
- Deleting a course cascades to its files, chat sessions, chat messages, and
  notes. Deleting a user cascades to that user's chat sessions and notes.
