import argparse
from pathlib import Path

from langchain_community.document_loaders import DirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from .embeddings import get_embedding


def build_vector_db(source_dir, output_dir):
    source_path = Path(source_dir)
    output_path = Path(output_dir)

    if not source_path.exists():
        raise FileNotFoundError(f"Source directory not found: {source_path}")

    loader = DirectoryLoader(str(source_path))
    documents = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100
    )

    docs = splitter.split_documents(documents)

    if not docs:
        raise ValueError(f"No documents loaded from: {source_path}")

    embedding = get_embedding()
    db = FAISS.from_documents(docs, embedding)
    db.save_local(str(output_path))

    print(f"Loaded documents: {len(documents)}")
    print(f"Text chunks: {len(docs)}")
    print(f"Vector store saved to: {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Build a FAISS vector store.")
    parser.add_argument("--source", default="source")
    parser.add_argument("--output", default="vector_store")
    args = parser.parse_args()

    build_vector_db(args.source, args.output)


if __name__ == "__main__":
    main()
