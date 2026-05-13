# Major Changes

This document summarizes the main system changes added in the database and
course-management update.

## 1. Database Support

- Added a SQLite database for persistent system data.
- Added database initialization in `backend/database.py`.
- The database stores authorized users, courses, uploaded course files, chat
  sessions, chat messages, and notes.
- The browser now keeps only the latest three chat sessions as a short-term
  local cache, while the full chat history is stored in the database.

## 2. Login Restriction

- Added a login page for the system.
- Login is restricted to three seeded HEBUT demo accounts:
  - `li.minghao@hebut.edu.cn`
  - `wang.yuxuan@hebut.edu.cn`
  - `zhao.ruilin@hebut.edu.cn`
- The `users` table now works as the authorized login account list.
- `/login` no longer creates accounts dynamically. It only allows sign-in when
  the submitted email already exists in the seeded account list.

## 3. Course Management

- Added a course management page.
- The system still starts with three default courses:
  - Software Engineering
  - Data Structures and Algorithms
  - Product and Service Development
- Users can add new courses.
- Users can upload course files for each course.
- Uploaded files are stored under the `source/` directory and recorded in the
  database.
- Users can preview uploaded courseware inside the course management page.

## 4. Notes and Export

- Added note creation for course materials.
- Notes are linked to users, courses, and optionally one uploaded course file.
- Notes are stored in the database.
- Added an export entry for notes. The export page opens a printable view that
  can be saved as a PDF through the browser print dialog.

## 5. Chat History

- Full chat history is now stored in the database through `chat_sessions` and
  `chat_messages`.
- The sidebar only keeps the latest three local sessions for quick access.
- Added a `History` button to open the full database-backed conversation
  history.
- Removed the always-visible `Database Archive` section from the sidebar.

## 6. Account Menu

- Moved `Sign Out` out of the sidebar action buttons.
- The username in the page header is now clickable.
- Clicking the username opens an account menu below it.
- `Sign Out` is now available from that account menu.

## 7. Database Documentation

- Added `docs/database-design.md`.
- The database document includes:
  - Entity relationship diagram
  - Primary keys
  - Foreign keys
  - Login account constraint diagram
  - Seed login account list
  - Relationship notes

## 8. Design and Language

- The system interface remains in English.
- The existing visual style is preserved: soft glass panels, restrained colors,
  rounded controls, and the same course assistant layout.
