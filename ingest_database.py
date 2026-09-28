import os
import shutil
from uuid import uuid4
from dotenv import load_dotenv

from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_chroma import Chroma

# Load environment variables
load_dotenv()

# Configuration
DATA_PATH = r"data"
CHROMA_PATH = r"chroma_db"

def ingest():
    print(f"Scanning for PDF documents in '{DATA_PATH}'...")
    loader = PyPDFDirectoryLoader(DATA_PATH)
    raw_documents = loader.load()

    if not raw_documents:
        print(f"No PDF documents found in '{DATA_PATH}' folder!")
        print("Please place your 6 Professional Ethics PDFs inside the 'data/' directory.")
        return

    print(f"Loaded {len(raw_documents)} pages across all PDF documents.")

    # Splitting into overlapping chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=600,
        chunk_overlap=150,
        length_function=len,
        is_separator_regex=False,
    )
    chunks = text_splitter.split_documents(raw_documents)
    print(f"Created {len(chunks)} chunks for vector embedding.")

    # Free, high-performance local embedding model (ONNX-accelerated, runs locally on CPU)
    print("Initializing local embedding model (BAAI/bge-small-en-v1.5)...")
    embeddings_model = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")

    # Recreate the vector store cleanly
    if os.path.exists(CHROMA_PATH):
        print(f"Removing old vector database at '{CHROMA_PATH}' for fresh rebuild...")
        shutil.rmtree(CHROMA_PATH, ignore_errors=True)

    print("Building Chroma vector store...")
    vector_store = Chroma(
        collection_name="ethics_collection",
        embedding_function=embeddings_model,
        persist_directory=CHROMA_PATH,
    )

    uuids = [str(uuid4()) for _ in range(len(chunks))]
    vector_store.add_documents(documents=chunks, ids=uuids)
    print(f"\nSUCCESS: Ingested {len(chunks)} chunks into '{CHROMA_PATH}'!")
    print("You can now run 'python chatbot.py' to launch your ethics study assistant.")

if __name__ == "__main__":
    ingest()