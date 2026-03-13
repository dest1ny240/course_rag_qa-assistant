from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from backend.rag_chain import build_chain

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

qa_chain = build_chain()

class Question(BaseModel):
    question: str


@app.post("/chat")
def chat(q: Question):

    result = qa_chain.invoke({"query": q.question})

    return {
        "answer": result["result"]
    }