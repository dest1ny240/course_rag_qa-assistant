import React, { useState } from "react";
import MessageBubble from "./MessageBubble.js";
import MessageInput from "./MessageInput.js";
import { askQuestion } from "../services/api.js";

const h = React.createElement;

const starterQuestions = [
  "Summarize the key ideas from this course.",
  "What topics should I review before the exam?",
  "Explain the most important concepts in simple language.",
];

export default function ChatWindow({
  course,
  messages,
  onMessagesChange,
  sessionId,
  userId,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async (text) => {
    if (isLoading) {
      return;
    }

    const userMessage = {
      role: "user",
      content: text,
    };

    const nextMessages = [...messages, userMessage];
    onMessagesChange(nextMessages);
    setIsLoading(true);
    setError("");

    try {
      const res = await askQuestion(text, course.id, sessionId, userId);
      const botMessage = {
        role: "assistant",
        content: res.answer,
        sources: res.sources ?? [],
        llmMode: res.llm_mode,
      };

      onMessagesChange([...nextMessages, botMessage]);
    } catch (requestError) {
      setError(requestError.message);
      onMessagesChange([
        ...nextMessages,
        {
          role: "assistant",
          content:
            "I could not reach the course assistant right now. Please check the backend connection and try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return h(
    "div",
    { className: "chat-window" },
    h(
      "div",
      { className: "messages" },
      messages.length === 0
        ? h(
            "div",
            { className: "empty-state" },
            h("div", { className: "empty-orb" }),
            h("h3", null, course.name),
            h(
              "p",
              null,
              "Choose a topic on the left, then start asking questions about lectures, notes, and revision materials."
            ),
            h(
              "div",
              { className: "starter-grid" },
              starterQuestions.map((question) =>
                h(
                  "button",
                  {
                    key: question,
                    className: "starter-card",
                    onClick: () => handleSend(question),
                  },
                  question
                )
              )
            )
          )
        : messages.map((message, index) =>
            h(MessageBubble, { key: `${message.role}-${index}`, message })
          )
    ),
    error ? h("div", { className: "error-banner" }, error) : null,
    h(MessageInput, {
      disabled: isLoading,
      onSend: handleSend,
      placeholder: `Ask something about ${course.name}...`,
    })
  );
}
