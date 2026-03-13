from langchain_community.document_loaders import DirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from .embeddings import get_embedding

loader = DirectoryLoader("source")

documents = loader.load()

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=100
)

docs = splitter.split_documents(documents)

embedding = get_embedding()

db = FAISS.from_documents(docs, embedding)

db.save_local("vector_store")

print("Vector DB built.")