from langchain_community.vectorstores import FAISS

from .embeddings import get_embedding

def load_vectorstore():

    embedding = get_embedding()

    db = FAISS.load_local(
        "vector_store",
        embedding,
        allow_dangerous_deserialization=True
    )

    return db