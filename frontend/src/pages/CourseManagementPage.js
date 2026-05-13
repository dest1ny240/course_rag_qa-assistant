import React, { useEffect, useMemo, useState } from "react";
import {
  createCourse,
  createNote,
  fetchCourseFiles,
  fetchNotes,
  getFilePreviewUrl,
  getNoteExportUrl,
  uploadCourseFile,
} from "../services/api.js";
import Header from "../components/Header.js";

const h = React.createElement;

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function CourseManagementPage({
  user,
  courses,
  onCoursesChange,
  onBack,
  onLogout,
}) {
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id ?? "");
  const [files, setFiles] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [status, setStatus] = useState("");
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [courseForm, setCourseForm] = useState({
    name: "",
    shortName: "",
    description: "",
  });
  const [noteForm, setNoteForm] = useState({
    title: "Lecture note",
    content: "",
  });

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? courses[0],
    [courses, selectedCourseId]
  );
  const selectedFile = files.find((file) => file.id === selectedFileId) ?? files[0];

  useEffect(() => {
    if (!selectedCourse) {
      return;
    }

    fetchCourseFiles(selectedCourse.id)
      .then((nextFiles) => {
        setFiles(nextFiles);
        setSelectedFileId(nextFiles[0]?.id ?? null);
      })
      .catch(() => setFiles([]));

    fetchNotes(user.id, selectedCourse.id)
      .then(setNotes)
      .catch(() => setNotes([]));
  }, [selectedCourse, user.id]);

  const handleCreateCourse = async (event) => {
    event.preventDefault();
    const id = slugify(courseForm.name);
    if (!id) {
      return;
    }

    const course = await createCourse({
      ...courseForm,
      id,
      createdByUserId: user.id,
    });
    onCoursesChange([...courses, course]);
    setSelectedCourseId(course.id);
    setCourseForm({ name: "", shortName: "", description: "" });
    setStatus("Course created.");
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedCourse) {
      return;
    }

    const uploadedFile = await uploadCourseFile(selectedCourse.id, user.id, file);
    setFiles((prev) => [uploadedFile, ...prev]);
    setSelectedFileId(uploadedFile.id);
    setStatus("File uploaded.");
  };

  const handleSaveNote = async () => {
    if (!selectedCourse || !noteForm.content.trim()) {
      return;
    }

    const note = await createNote({
      userId: user.id,
      courseId: selectedCourse.id,
      fileId: selectedFile?.id ?? null,
      title: noteForm.title,
      content: noteForm.content,
    });
    setNotes((prev) => [note, ...prev]);
    setNoteForm({ title: "Lecture note", content: "" });
    setStatus("Note saved.");
  };

  return h(
    "div",
    { className: "app-shell management-shell" },
    h(
      "aside",
      { className: "sidebar" },
      h(
        "div",
        { className: "sidebar-top" },
        h("p", { className: "eyebrow" }, "Course Management"),
        h("h1", { className: "sidebar-title" }, "Manage materials, notes, and previews."),
        h("button", { className: "primary-button", onClick: onBack }, "Back to Chat")
      ),
      h(
        "section",
        { className: "sidebar-section sidebar-history" },
        h("div", { className: "section-header" }, h("h2", null, "Courses"), h("span", null, courses.length)),
        h(
          "div",
          { className: "history-list" },
          courses.map((course) =>
            h(
              "button",
              {
                key: course.id,
                className:
                  course.id === selectedCourseId
                    ? "course-button active"
                    : "course-button",
                onClick: () => setSelectedCourseId(course.id),
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
      )
    ),
    h(
      "main",
      { className: "workspace management-workspace" },
      selectedCourse
        ? h(Header, {
            course: selectedCourse,
            user,
            onLogout,
            eyebrow: "Selected course",
          })
        : h(
            "header",
            { className: "header" },
            h(
              "div",
              null,
              h("p", { className: "eyebrow" }, "Selected course"),
              h("h2", null, "No course selected"),
              h("p", { className: "header-subtitle" }, "")
            ),
            h(
              "div",
              { className: "account-menu" },
              h(
                "button",
                {
                  className: "user-pill",
                  onClick: () => setIsAccountOpen((isOpen) => !isOpen),
                },
                user.display_name
              ),
              isAccountOpen
                ? h(
                    "div",
                    { className: "account-popover" },
                    h("small", null, user.email),
                    h("button", { onClick: onLogout }, "Sign Out")
                  )
                : null
            )
          ),
      h(
        "div",
        { className: "management-grid" },
        h(
          "section",
          { className: "management-panel" },
          h("h3", null, "Add Course"),
          h(
            "form",
            { className: "stacked-form", onSubmit: handleCreateCourse },
            h("input", {
              placeholder: "Course name",
              value: courseForm.name,
              onChange: (event) =>
                setCourseForm((prev) => ({ ...prev, name: event.target.value })),
              required: true,
            }),
            h("input", {
              placeholder: "Short name",
              value: courseForm.shortName,
              onChange: (event) =>
                setCourseForm((prev) => ({
                  ...prev,
                  shortName: event.target.value.toUpperCase(),
                })),
              required: true,
            }),
            h("textarea", {
              placeholder: "Description",
              value: courseForm.description,
              onChange: (event) =>
                setCourseForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                })),
              required: true,
            }),
            h("button", { className: "send-button" }, "Create Course")
          )
        ),
        h(
          "section",
          { className: "management-panel" },
          h("h3", null, "Course Files"),
          h("label", { className: "file-picker" }, "Upload File", h("input", { type: "file", onChange: handleUpload })),
          h(
            "div",
            { className: "file-list" },
            files.map((file) =>
              h(
                "button",
                {
                  key: file.id,
                  className: file.id === selectedFile?.id ? "file-row active" : "file-row",
                  onClick: () => setSelectedFileId(file.id),
                },
                h("strong", null, file.original_name),
                h("small", null, `${Math.ceil(file.size_bytes / 1024)} KB`)
              )
            )
          )
        ),
        h(
          "section",
          { className: "management-panel preview-panel" },
          h("h3", null, "Preview"),
          selectedFile
            ? h("iframe", {
                title: selectedFile.original_name,
                src: getFilePreviewUrl(selectedFile.id),
              })
            : h("div", { className: "empty-preview" }, "Upload or select a file to preview.")
        ),
        h(
          "section",
          { className: "management-panel notes-panel" },
          h("h3", null, "Notes"),
          h("input", {
            value: noteForm.title,
            onChange: (event) =>
              setNoteForm((prev) => ({ ...prev, title: event.target.value })),
          }),
          h("textarea", {
            value: noteForm.content,
            onChange: (event) =>
              setNoteForm((prev) => ({ ...prev, content: event.target.value })),
            placeholder: "Write notes while reviewing the file...",
          }),
          h(
            "div",
            { className: "note-actions" },
            h("button", { className: "send-button", onClick: handleSaveNote }, "Save Note"),
            notes[0]
              ? h(
                  "a",
                  {
                    className: "secondary-link",
                    href: getNoteExportUrl(notes[0].id),
                    target: "_blank",
                    rel: "noreferrer",
                  },
                  "Export Latest PDF"
                )
              : null
          ),
          h(
            "div",
            { className: "note-list" },
            notes.slice(0, 4).map((note) =>
              h(
                "article",
                { key: note.id, className: "note-card" },
                h("strong", null, note.title),
                h("p", null, note.content.slice(0, 120))
              )
            )
          ),
          status ? h("small", { className: "status-text" }, status) : null
        )
      )
    )
  );
}
