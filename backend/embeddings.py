import os
from pathlib import Path

from langchain_huggingface import HuggingFaceEmbeddings


def load_environment_file():
    env_path = Path(__file__).resolve().parents[1] / ".env"

    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue

        key, value = stripped.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def get_embedding():
    load_environment_file()

    model_name = os.getenv(
        "EMBEDDING_MODEL",
        "sentence-transformers/all-MiniLM-L6-v2",
    )
    offline = os.getenv("EMBEDDING_OFFLINE", "true").lower() == "true"

    if offline:
        os.environ.setdefault("HF_HUB_OFFLINE", "1")
        os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

    embedding = HuggingFaceEmbeddings(
        model_name=model_name,
        model_kwargs={"local_files_only": offline},
    )

    return embedding
