import React, { useState } from "react";

const h = React.createElement;

export default function Header({
  course,
  user,
  onLogout,
  eyebrow = "Current course",
}) {
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  return h(
    "header",
    { className: "header" },
    h(
      "div",
      null,
      h("p", { className: "eyebrow" }, eyebrow),
      h("h2", null, course.name),
      h("p", { className: "header-subtitle" }, course.description)
    ),
    user
      ? h(
          "div",
          { className: "account-menu" },
          h(
            "button",
            {
              className: "user-pill",
              onClick: () => setIsAccountOpen((isOpen) => !isOpen),
              "aria-expanded": isAccountOpen,
            },
            user.display_name
          ),
          isAccountOpen
            ? h(
                "div",
                { className: "account-popover" },
                h("small", null, user.email),
                h(
                  "button",
                  {
                    onClick: () => {
                      setIsAccountOpen(false);
                      onLogout();
                    },
                  },
                  "Sign Out"
                )
              )
            : null
        )
      : null
  );
}
