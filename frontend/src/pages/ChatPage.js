import React, { useEffect, useMemo, useState } from "react";
import ChatWindow from "../components/ChatWindow.js";
import Header from "../components/Header.js";
import {
  createChatSession,
  fetchSessionMessages,
  fetchSessions,
} from "../services/api.js";

const STORAGE_KEY = "hebut-rag-recent-sessions";
const h = React.createElement;

function createSession(courseId, userId, title = "New conversation") {
  return {
    id: `${courseId}-${userId}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    courseId,
    title,
    preview: "No messages yet",
    updatedAt: "Just now",
    messages: [],
  };
}

function readRecentSessions(userId) {
  try {
    const savedState = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    const recentSessions = savedState?.[userId];
    return Array.isArray(recentSessions) ? recentSessions.slice(0, 3) : [];
  } catch {
    return [];
  }
}

function writeRecentSessions(userId, sessions) {
  const savedState = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
  savedState[userId] = sessions.slice(0, 3);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));
}

export default function ChatPage({ user, courses, onManageCourses, onLogout }) {
  const firstCourse = courses[0];
  const initialRecentSessions = useMemo(() => readRecentSessions(user.id), [user.id]);
  const [selectedCourseId, setSelectedCourseId] = useState(
    initialRecentSessions[0]?.courseId ?? firstCourse?.id
  );
  const [recentSessions, setRecentSessions] = useState(initialRecentSessions);
  const [archiveSessions, setArchiveSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(
    initialRecentSessions[0]?.id ?? ""
  );
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? firstCourse,
    [courses, firstCourse, selectedCourseId]
  );

  const allSessions = useMemo(() => {
    const recentIds = new Set(recentSessions.map((session) => session.id));
    return [
      ...recentSessions,
      ...archiveSessions.filter((session) => !recentIds.has(session.id)),
    ];
  }, [archiveSessions, recentSessions]);

  const activeSession =
    allSessions.find((session) => session.id === activeSessionId) ??
    recentSessions[0] ??
    allSessions[0];

  useEffect(() => {
    if (!activeSession && firstCourse) {
      const newSession = createSession(firstCourse.id, user.id);
      setRecentSessions([newSession]);
      setSelectedCourseId(firstCourse.id);
      setActiveSessionId(newSession.id);
      createChatSession({ ...newSession, userId: user.id }).catch(() => {});
    }
  }, [activeSession, firstCourse, user.id]);

  useEffect(() => {
    fetchSessions(user.id)
      .then((sessions) => {
        setArchiveSessions(sessions);
        if (!activeSessionId && sessions.length > 0) {
          setActiveSessionId(sessions[0].id);
          setSelectedCourseId(sessions[0].courseId);
        }
      })
      .catch(() => setArchiveSessions([]));
  }, [activeSessionId, user.id]);

  useEffect(() => {
    writeRecentSessions(user.id, recentSessions);
  }, [recentSessions, user.id]);

  const promoteRecentSession = async (session) => {
    let sessionWithMessages = session;
    if (!Array.isArray(session.messages) || session.messages.length === 0) {
      try {
        const messages = await fetchSessionMessages(session.id);
        sessionWithMessages = { ...session, messages };
      } catch {
        sessionWithMessages = { ...session, messages: [] };
      }
    }

    setRecentSessions((prev) => [
      sessionWithMessages,
      ...prev.filter((item) => item.id !== sessionWithMessages.id),
    ].slice(0, 3));
    setActiveSessionId(sessionWithMessages.id);
    setSelectedCourseId(sessionWithMessages.courseId);
  };

  const handleCourseChange = (courseId) => {
    setSelectedCourseId(courseId);

    const latestSessionForCourse = allSessions.find(
      (session) => session.courseId === courseId
    );

    if (latestSessionForCourse) {
      promoteRecentSession(latestSessionForCourse);
      return;
    }

    const newSession = createSession(courseId, user.id);
    setRecentSessions((prev) => [newSession, ...prev].slice(0, 3));
    setActiveSessionId(newSession.id);
    createChatSession({ ...newSession, userId: user.id }).catch(() => {});
  };

  const handleNewChat = () => {
    const newSession = createSession(selectedCourseId, user.id);
    setRecentSessions((prev) => [newSession, ...prev].slice(0, 3));
    setActiveSessionId(newSession.id);
    createChatSession({ ...newSession, userId: user.id }).catch(() => {});
  };

  const handleMessagesChange = (nextMessages) => {
    setRecentSessions((prev) =>
      prev.map((session) => {
        if (session.id !== activeSession.id) {
          return session;
        }

        const firstUserMessage = nextMessages.find((message) => message.role === "user");
        const lastMessage = nextMessages[nextMessages.length - 1];

        return {
          ...session,
          messages: nextMessages,
          title: firstUserMessage
            ? firstUserMessage.content.slice(0, 28)
            : session.title,
          preview: lastMessage ? lastMessage.content.slice(0, 52) : "No messages yet",
          updatedAt: "Just now",
        };
      })
    );
  };

  if (!selectedCourse || !activeSession) {
    return h("div", { className: "app-shell" }, h("main", { className: "workspace loading-panel" }, "Loading workspace..."));
  }

  return h(
    "div",
    { className: "app-shell" },
    h(
      "aside",
      { className: "sidebar" },
      h(
        "div",
        { className: "sidebar-top" },
        h(
          "div",
          null,
          h("p", { className: "eyebrow" }, "Course Assistant"),
          h("h1", { className: "sidebar-title" }, "Ask your course materials beautifully.")
        ),
        h("button", { className: "primary-button", onClick: handleNewChat }, "New Chat"),
        h(
          "div",
          { className: "sidebar-actions" },
          h("button", { onClick: onManageCourses }, "Manage Courses"),
          h("button", { onClick: () => setIsHistoryOpen(true) }, "History")
        )
      ),
      h(
        "section",
        { className: "sidebar-section" },
        h("div", { className: "section-header" }, h("h2", null, "Courses"), h("span", null, courses.length)),
        h(
          "div",
          { className: "course-switcher" },
          courses.map((course) =>
            h(
              "button",
              {
                key: course.id,
                className:
                  course.id === selectedCourseId
                    ? "course-button active"
                    : "course-button",
                onClick: () => handleCourseChange(course.id),
              },
              h("span", { className: "course-badge" }, course.shortName),
              h(
                "span",
                { className: "course-copy" },
                h("strong", null, course.name),
                h("small", null, course.description)
              )
            )
          )
        )
      ),
      h(
        "section",
        { className: "sidebar-section sidebar-history" },
        h("div", { className: "section-header" }, h("h2", null, "Recent Local"), h("span", null, recentSessions.length)),
        h(
          "div",
          { className: "history-list" },
          recentSessions.map((session) => {
            const course = courses.find((item) => item.id === session.courseId);
            const isActive = session.id === activeSession.id;

            return h(
              "button",
              {
                key: session.id,
                className: isActive ? "history-card active" : "history-card",
                onClick: () => promoteRecentSession(session),
              },
              h(
                "div",
                { className: "history-content" },
                h(
                  "div",
                  { className: "history-card-top" },
                  h("strong", null, session.title),
                  h("span", null, session.updatedAt)
                ),
                h("p", null, session.preview),
                h("small", null, course?.name ?? "Unknown course")
              )
            );
          })
        )
      ),
      null
    ),
    h(
      "main",
      { className: "workspace" },
      h(Header, {
        course: selectedCourse,
        session: activeSession,
        user,
        onLogout,
      }),
      h(ChatWindow, {
        course: selectedCourse,
        messages: activeSession.messages,
        onMessagesChange: handleMessagesChange,
        sessionId: activeSession.id,
        userId: user.id,
      }),
      isHistoryOpen
        ? h(
            "div",
            { className: "history-overlay" },
            h(
              "section",
              { className: "history-panel" },
              h(
                "div",
                { className: "history-panel-header" },
                h(
                  "div",
                  null,
                  h("p", { className: "eyebrow" }, "Complete History"),
                  h("h3", null, "All conversations")
                ),
                h(
                  "button",
                  {
                    className: "close-button",
                    onClick: () => setIsHistoryOpen(false),
                    "aria-label": "Close history",
                  },
                  "x"
                )
              ),
              h(
                "div",
                { className: "full-history-list" },
                archiveSessions.length === 0
                  ? h("p", { className: "muted-text" }, "No saved conversations yet.")
                  : archiveSessions.map((session) => {
                      const course = courses.find(
                        (item) => item.id === session.courseId
                      );
                      return h(
                        "button",
                        {
                          key: session.id,
                          className:
                            session.id === activeSession.id
                              ? "full-history-row active"
                              : "full-history-row",
                          onClick: async () => {
                            await promoteRecentSession(session);
                            setIsHistoryOpen(false);
                          },
                        },
                        h("strong", null, session.title),
                        h("span", null, session.preview),
                        h("small", null, course?.name ?? "Unknown course")
                      );
                    })
              )
            )
          )
        : null
    )
  );
}
