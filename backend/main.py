import os

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

qa_chains = {}

class Question(BaseModel):
    question: str
    course_id: str | None = None


def format_sources(documents):
    sources = []

    for document in documents:
        metadata = document.metadata or {}
        source_path = metadata.get("source", "Unknown source")
        page = metadata.get("page")

        sources.append(
            {
                "source": os.path.basename(source_path),
                "page": page + 1 if isinstance(page, int) else page,
                "content": document.page_content[:360],
            }
        )

    return sources


def get_chain(course_id, force_api=False):
    selected_course_id = course_id or "software-engineering"
    cache_key = (selected_course_id, "api" if force_api else "auto")

    if cache_key not in qa_chains:
        qa_chain, llm_mode = build_chain(selected_course_id, force_api=force_api)
        qa_chains[cache_key] = {
            "chain": qa_chain,
            "llm_mode": llm_mode,
        }

    return qa_chains[cache_key]


@app.post("/chat")
def chat(q: Question):

    chain_entry = get_chain(q.course_id)

    try:
        result = chain_entry["chain"].invoke({"query": q.question})
    except Exception:
        if chain_entry["llm_mode"] != "local":
            raise

        chain_entry = get_chain(q.course_id, force_api=True)
        result = chain_entry["chain"].invoke({"query": q.question})

    return {
        "answer": result["result"],
        "sources": format_sources(result.get("source_documents", [])),
        "llm_mode": chain_entry["llm_mode"],
    }
