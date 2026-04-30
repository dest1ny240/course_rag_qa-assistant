import React from "react";

const h = React.createElement;

export default function Header({ course }) {
  return h(
    "header",
    { className: "header" },
    h(
      "div",
      null,
      h("p", { className: "eyebrow" }, "Current course"),
      h("h2", null, course.name),
      h("p", { className: "header-subtitle" }, course.description)
    ),
    null
  );
}
