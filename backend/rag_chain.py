from langchain_classic.chains import RetrievalQA

from backend.llm import get_llm_with_mode
from backend.faiss_store import load_vectorstore
from backend.qa_prompt import get_prompt


def build_chain(course_id="software-engineering", force_api=False):

    llm, llm_mode = get_llm_with_mode(force_api=force_api)

    vectorstore = load_vectorstore(course_id)

    retriever = vectorstore.as_retriever(
        search_kwargs={"k":4}
    )

    prompt = get_prompt()

    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=retriever,
        chain_type="stuff",
        chain_type_kwargs={"prompt": prompt},
        return_source_documents=True,
    )

    return qa_chain, llm_mode
