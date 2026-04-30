import React, { useEffect, useMemo, useState } from "react";
import ChatWindow from "../components/ChatWindow.js";
import Header from "../components/Header.js";

const STORAGE_KEY = "hebut-rag-chat-state";
const h = React.createElement;

const courses = [
  {
    id: "software-engineering",
    name: "Software Engineering",
    shortName: "SE",
    description: "Lecture slides, course notes, and review materials.",
  },
  {
    id: "data-structures-and-algorithms",
    name: "Data Structures and Algorithms",
    shortName: "DSA",
    description: "Arrays, linked lists, trees, graphs, sorting, searching, and algorithm analysis.",
  },
  {
    id: "product-service-development",
    name: "Product and Service Development",
    shortName: "PSD",
    description: "Product lifecycle, opportunities, concepts, refinement, and service development.",
  },
];

function createSession(courseId, title = "New conversation") {
  return {
    id: `${courseId}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    courseId,
    title,
    preview: "No messages yet",
    updatedAt: "Just now",
    messages: [],
  };
}

const defaultSessions = [
  {
    id: "software-engineering-demo",
    courseId: "software-engineering",
    title: "Software quality review",
    preview: "How do configuration management and QA relate?",
    updatedAt: "Today",
    messages: [
      {
        role: "assistant",
        content:
          "Welcome back. Ask about lectures, concepts, revision points, or course materials.",
      },
    ],
  },
  createSession("data-structures-and-algorithms", "Tree traversal notes"),
  createSession("product-service-development", "Product strategy questions"),
];

function loadInitialState() {
  try {
    const savedState = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    const hasValidSessions =
      Array.isArray(savedState?.sessions) && savedState.sessions.length > 0;

    if (!hasValidSessions) {
      throw new Error("Missing saved sessions");
    }

    const activeSession =
      savedState.sessions.find(
        (session) => session.id === savedState.activeSessionId
      ) ?? savedState.sessions[0];

    const selectedCourse =
      courses.find((course) => course.id === savedState.selectedCourseId) ??
      courses.find((course) => course.id === activeSession.courseId) ??
      courses[0];

    return {
      selectedCourseId: selectedCourse.id,
      activeSessionId: activeSession.id,
      sessions: savedState.sessions,
    };
  } catch {
    return {
      selectedCourseId: courses[0].id,
      activeSessionId: defaultSessions[0].id,
      sessions: defaultSessions,
    };
  }
}

export default function ChatPage() {
  const initialState = useMemo(() => loadInitialState(), []);
  const [selectedCourseId, setSelectedCourseId] = useState(
    initialState.selectedCourseId
  );
  const [sessions, setSessions] = useState(initialState.sessions);
  const [activeSessionId, setActiveSessionId] = useState(
    initialState.activeSessionId
  );

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? courses[0],
    [selectedCourseId]
  );

  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ?? sessions[0];

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        selectedCourseId,
        activeSessionId,
        sessions,
      })
    );
  }, [activeSessionId, selectedCourseId, sessions]);

  const handleCourseChange = (courseId) => {
    setSelectedCourseId(courseId);

    const latestSessionForCourse = sessions.find(
      (session) => session.courseId === courseId
    );

    if (latestSessionForCourse) {
      setActiveSessionId(latestSessionForCourse.id);
      return;
    }

    const newSession = createSession(courseId);
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const handleNewChat = () => {
    const newSession = createSession(selectedCourseId);
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const handleSelectSession = (sessionId) => {
    const nextSession = sessions.find((session) => session.id === sessionId);
    if (!nextSession) {
      return;
    }

    setActiveSessionId(sessionId);
    setSelectedCourseId(nextSession.courseId);
  };

  const handleDeleteSession = (sessionId) => {
    setSessions((prev) => {
      const remainingSessions = prev.filter((session) => session.id !== sessionId);

      if (remainingSessions.length === 0) {
        const fallbackSession = createSession(selectedCourseId);
        setActiveSessionId(fallbackSession.id);
        return [fallbackSession];
      }

      if (sessionId === activeSessionId) {
        setActiveSessionId(remainingSessions[0].id);
        setSelectedCourseId(remainingSessions[0].courseId);
      }

      return remainingSessions;
    });
  };

  const handleMessagesChange = (nextMessages) => {
    setSessions((prev) =>
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
        h("button", { className: "primary-button", onClick: handleNewChat }, "New Chat")
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
        h("div", { className: "section-header" }, h("h2", null, "History"), h("span", null, sessions.length)),
        h(
          "div",
          { className: "history-list" },
          sessions.map((session) => {
            const course = courses.find((item) => item.id === session.courseId);
            const isActive = session.id === activeSession.id;

            return h(
              "div",
              {
                key: session.id,
                className: isActive ? "history-card active" : "history-card",
              },
              h(
                "button",
                {
                  className: "history-content",
                  onClick: () => handleSelectSession(session.id),
                },
                h(
                  "div",
                  { className: "history-card-top" },
                  h("strong", null, session.title),
                  h("span", null, session.updatedAt)
                ),
                h("p", null, session.preview),
                h("small", null, course?.name ?? "Unknown course")
              ),
              h(
                "button",
                {
                  className: "delete-history-button",
                  "aria-label": `Delete ${session.title}`,
                  onClick: () => handleDeleteSession(session.id),
                  title: "Delete conversation",
                },
                "x"
              )
            );
          })
        )
      )
    ),
    h(
      "main",
      { className: "workspace" },
      h(Header, { course: selectedCourse, session: activeSession }),
      h(ChatWindow, {
        course: selectedCourse,
        messages: activeSession.messages,
        onMessagesChange: handleMessagesChange,
      })
    )
  );
}
