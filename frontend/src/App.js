import React, { useEffect, useState } from "react";
import ChatPage from "./pages/ChatPage.js";
import CourseManagementPage from "./pages/CourseManagementPage.js";
import LoginPage from "./pages/LoginPage.js";
import { fetchCourses } from "./services/api.js";

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem("hebut-rag-user"));
    } catch {
      return null;
    }
  });
  const [view, setView] = useState("chat");
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    if (!user) {
      return;
    }

    fetchCourses()
      .then(setCourses)
      .catch(() => setCourses([]));
  }, [user]);

  const handleLogin = (nextUser) => {
    setUser(nextUser);
    window.localStorage.setItem("hebut-rag-user", JSON.stringify(nextUser));
  };

  const handleLogout = () => {
    setUser(null);
    setView("chat");
    window.localStorage.removeItem("hebut-rag-user");
  };

  if (!user) {
    return React.createElement(LoginPage, { onLogin: handleLogin });
  }

  if (view === "manage") {
    return React.createElement(CourseManagementPage, {
      user,
      courses,
      onCoursesChange: setCourses,
      onBack: () => setView("chat"),
      onLogout: handleLogout,
    });
  }

  return React.createElement(ChatPage, {
    user,
    courses,
    onManageCourses: () => setView("manage"),
    onLogout: handleLogout,
  });
}
