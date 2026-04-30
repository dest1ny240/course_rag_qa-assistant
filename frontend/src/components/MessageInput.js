import React, { useState } from "react";

const h = React.createElement;

export default function MessageInput({ disabled, onSend, placeholder }) {
  const [text, setText] = useState("");

  const handleSend = () => {
    const trimmedText = text.trim();
    if (!trimmedText || disabled) {
      return;
    }

    onSend(trimmedText);
    setText("");
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return h(
    "div",
    { className: "input-box" },
    h("input", {
      value: text,
      onChange: (event) => setText(event.target.value),
      onKeyDown: handleKeyDown,
      placeholder,
      disabled,
    }),
    h(
      "button",
      { className: "send-button", onClick: handleSend, disabled },
      disabled ? "Sending..." : "Send"
    )
  );
}
