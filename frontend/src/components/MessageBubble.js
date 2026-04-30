import React from "react";

const h = React.createElement;

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const sources = Array.isArray(message.sources) ? message.sources : [];

  return h(
    "div",
    { className: isUser ? "message user" : "message bot" },
    h(
      "div",
      { className: "message-meta" },
      h("span", { className: "message-role" }, isUser ? "You" : "Assistant"),
      !isUser && message.llmMode
        ? h(
            "span",
            { className: "mode-badge" },
            message.llmMode === "local"
              ? "Local model"
              : message.llmMode === "deepseek"
                ? "DeepSeek"
              : message.llmMode === "google"
                ? "Google Gemini"
                : "API fallback"
          )
        : null
    ),
    h("p", null, message.content),
    !isUser && sources.length > 0
      ? h(
          "div",
          { className: "source-list" },
          h("span", { className: "source-title" }, "Sources"),
          sources.map((source, index) =>
            h(
              "div",
              { className: "source-card", key: `${source.source}-${index}` },
              h(
                "strong",
                null,
                source.page ? `${source.source} · p.${source.page}` : source.source
              ),
              h("small", null, source.content)
            )
          )
        )
      : null
  );
}
