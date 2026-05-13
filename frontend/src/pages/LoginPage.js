import React, { useEffect, useState } from "react";
import { fetchLoginAccounts, login } from "../services/api.js";

const h = React.createElement;
const fallbackAccounts = [
  { email: "li.minghao@hebut.edu.cn", display_name: "Li Minghao" },
  { email: "wang.yuxuan@hebut.edu.cn", display_name: "Wang Yuxuan" },
  { email: "zhao.ruilin@hebut.edu.cn", display_name: "Zhao Ruilin" },
];

export default function LoginPage({ onLogin }) {
  const [accounts, setAccounts] = useState(fallbackAccounts);
  const [email, setEmail] = useState(fallbackAccounts[0].email);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchLoginAccounts()
      .then((nextAccounts) => {
        if (nextAccounts.length > 0) {
          setAccounts(nextAccounts);
          setEmail(nextAccounts[0].email);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const user = await login(email);
      onLogin(user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return h(
    "div",
    { className: "login-shell" },
    h(
      "form",
      { className: "login-panel", onSubmit: handleSubmit },
      h("p", { className: "eyebrow" }, "HEBUT Course Assistant"),
      h("h1", null, "Sign in to your learning workspace."),
      h(
        "label",
        null,
        "Email",
        h("input", {
          value: email,
          onChange: (event) => setEmail(event.target.value),
          type: "email",
          required: true,
        })
      ),
      h(
        "div",
        { className: "account-list" },
        accounts.map((account) =>
          h(
            "button",
            {
              key: account.email,
              type: "button",
              className:
                account.email === email ? "account-choice active" : "account-choice",
              onClick: () => setEmail(account.email),
            },
            h("strong", null, account.display_name),
            h("small", null, account.email)
          )
        )
      ),
      error ? h("div", { className: "error-banner login-error" }, error) : null,
      h(
        "button",
        { className: "primary-button", disabled: isLoading },
        isLoading ? "Signing in..." : "Sign In"
      )
    )
  );
}
