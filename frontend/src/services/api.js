export async function askQuestion(question, courseId) {
  const res = await fetch("http://localhost:8000/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      course_id: courseId,
    }),
  });

  if (!res.ok) {
    throw new Error("The assistant service is unavailable right now.");
  }

  return res.json();
}
