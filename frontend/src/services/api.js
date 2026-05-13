const API_BASE_URL = "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, options);

  if (!res.ok) {
    const message = options.errorMessage ?? "The assistant service is unavailable right now.";
    throw new Error(message);
  }

  return res.json();
}

export async function login(email) {
  return request("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
    }),
    errorMessage: "Sign in failed. Please try again.",
  });
}

export async function fetchLoginAccounts() {
  return request("/login/accounts", {
    errorMessage: "Could not load authorized accounts.",
  });
}

export async function fetchCourses() {
  return request("/courses");
}

export async function createCourse(course) {
  return request("/courses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: course.id,
      name: course.name,
      short_name: course.shortName,
      description: course.description,
      created_by_user_id: course.createdByUserId,
    }),
    errorMessage: "Could not create this course.",
  });
}

export async function fetchCourseFiles(courseId) {
  return request(`/courses/${courseId}/files`);
}

export async function uploadCourseFile(courseId, userId, file) {
  const data = new FormData();
  data.append("file", file);

  return request(`/courses/${courseId}/files?uploaded_by_user_id=${userId}`, {
    method: "POST",
    body: data,
    errorMessage: "Could not upload this file.",
  });
}

export function getFilePreviewUrl(fileId) {
  return `${API_BASE_URL}/files/${fileId}/preview`;
}

export async function fetchSessions(userId) {
  return request(`/chat/sessions?user_id=${userId}`);
}

export async function createChatSession(session) {
  return request("/chat/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: session.id,
      user_id: session.userId,
      course_id: session.courseId,
      title: session.title,
    }),
  });
}

export async function fetchSessionMessages(sessionId) {
  return request(`/chat/sessions/${sessionId}/messages`);
}

export async function askQuestion(question, courseId, sessionId, userId) {
  return request("/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      course_id: courseId,
      session_id: sessionId,
      user_id: userId,
    }),
    errorMessage: "The assistant service is unavailable right now.",
  });
}

export async function fetchNotes(userId, courseId) {
  return request(`/notes?user_id=${userId}&course_id=${courseId}`);
}

export async function createNote(note) {
  return request("/notes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: note.userId,
      course_id: note.courseId,
      file_id: note.fileId,
      title: note.title,
      content: note.content,
    }),
    errorMessage: "Could not save this note.",
  });
}

export function getNoteExportUrl(noteId) {
  return `${API_BASE_URL}/notes/${noteId}/export`;
}
