from langchain_community.vectorstores import FAISS

from .embeddings import get_embedding

COURSE_VECTOR_STORES = {
    "software-engineering": "vector_store",
    "data-structures-and-algorithms": "vector_store/data-structures-and-algorithms",
    "product-service-development": "vector_store/product-service-development",
}


def load_vectorstore(course_id="software-engineering"):

    embedding = get_embedding()
    vector_store_path = COURSE_VECTOR_STORES.get(
        course_id,
        COURSE_VECTOR_STORES["software-engineering"],
    )

    db = FAISS.load_local(
        vector_store_path,
        embedding,
        allow_dangerous_deserialization=True
    )

    return db
