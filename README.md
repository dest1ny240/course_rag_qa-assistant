# HEBUT Course RAG Assistant

This project is a RAG-based course Q&A assistant. It supports multiple course
knowledge bases, source traceability, and automatic LLM switching.

## Project Structure

- `backend/`: FastAPI backend, RAG chain, LLM selection, and vector store loading
- `frontend/`: React frontend chat UI
- `source/`: course PDF materials
- `vector_store/`: generated FAISS indexes
- `docs/`: graduation design notes and improvement plan

## LLM Mode

The backend first checks whether the local OpenAI-compatible LLM server is
running. If it is available, the system uses the local model. If it is not
available, the backend falls back to DeepSeek when `DEEPSEEK_API_KEY` is set.
If no DeepSeek key is provided, it can use Google Gemini or another
OpenAI-compatible API.

Create or edit `.env`:

```env
LOCAL_LLM_BASE_URL=http://127.0.0.1:1233/v1
LOCAL_LLM_API_KEY=lm-studio
LOCAL_LLM_MODEL=qwen/qwen3-4b-2507
LOCAL_LLM_TIMEOUT=1.5

EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
EMBEDDING_OFFLINE=true

FALLBACK_PROVIDER=auto

DEEPSEEK_API_KEY=your_deepseek_key_here
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com

GOOGLE_API_KEY=your_google_ai_key_here
GOOGLE_MODEL=gemini-2.5-flash

AI_API_KEY=
AI_MODEL=gpt-4o-mini

# Optional for third-party OpenAI-compatible APIs:
# AI_BASE_URL=https://api.openai.com/v1
```

Do not commit `.env`; use `.env.example` as the template.

## Run Locally

Install the Python dependencies from the project root:

```bash
pip install -r requirements.txt
```

Start the backend API from the project root. If you are currently inside the
`backend/` directory, run `cd ..` first:

```bash
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

In another terminal, install the frontend dependencies and start the React
development server:

```bash
cd frontend
npm install
npm run dev
```

Open the frontend at `http://127.0.0.1:8080`. The frontend sends chat requests
to the backend API at `http://127.0.0.1:8000`.

## Build A Course Vector Store

```bash
python -m backend.build_vector_db --source source/data-structures-and-algorithms --output vector_store/data-structures-and-algorithms
```
