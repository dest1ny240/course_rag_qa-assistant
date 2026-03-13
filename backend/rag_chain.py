from langchain_classic.chains import RetrievalQA

from backend.llm import get_llm
from backend.faiss_store import load_vectorstore
from backend.qa_prompt import get_prompt


def build_chain():

    llm = get_llm()

    vectorstore = load_vectorstore()

    retriever = vectorstore.as_retriever(
        search_kwargs={"k":4}
    )

    prompt = get_prompt()

    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=retriever,
        chain_type="stuff",
        chain_type_kwargs={"prompt": prompt}
    )

    return qa_chain