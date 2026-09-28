import os
import gradio as gr
from dotenv import load_dotenv

from langchain_groq import ChatGroq
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_chroma import Chroma

# Load environment variables
load_dotenv()

# Verify GROQ_API_KEY
if not os.getenv("GROQ_API_KEY"):
    print("WARNING: GROQ_API_KEY not found in .env file! Please add it before chatting.")

# Configuration
CHROMA_PATH = r"chroma_db"

# Initialize local embedding model matching ingest_database.py
embeddings_model = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")

# Initialize Groq LLM (high-speed, highly capable reasoning model)
llm = ChatGroq(
    model_name="qwen/qwen3.8-27b",
    temperature=0.3,
    streaming=True
)

# Connect to ChromaDB
vector_store = Chroma(
    collection_name="ethics_collection",
    embedding_function=embeddings_model,
    persist_directory=CHROMA_PATH,
)

# Retrieve top relevant context chunks
retriever = vector_store.as_retriever(search_kwargs={"k": 5})

def stream_response(message, history):
    if not message or not message.strip():
        yield "Please enter a question or topic about your Professional Ethics course."
        return

    # Retrieve relevant document chunks
    docs = retriever.invoke(message)

    # Format retrieved knowledge with file sources and pages
    knowledge_blocks = []
    sources = set()
    for doc in docs:
        source_name = os.path.basename(doc.metadata.get("source", "PDF"))
        page = doc.metadata.get("page", 0) + 1  # 1-indexed for student convenience
        sources.add(f"- `{source_name}` (Page {page})")
        knowledge_blocks.append(f"[{source_name} - Page {page}]:\n{doc.page_content}")

    knowledge_text = "\n\n---\n\n".join(knowledge_blocks)

    # Professional Ethics Midterm Study Prompt
    prompt = f"""You are an expert tutor for a university-level Professional Ethics course, helping a student prepare for their midterm exam.

Your goal is to provide accurate, comprehensive, and well-structured answers strictly grounded in the course materials provided below.

When answering:
1. Ground your answer in the provided knowledge.
2. If asked about ethical theories (e.g. Utilitarianism, Kantianism/Deontology, Virtue Ethics, Social Contract, Rights theory), clearly define them and show how they apply.
3. If asked about professional codes (e.g. ACM, IEEE, Software Engineering Code of Ethics), quote or reference the relevant principles.
4. If asked for practice questions or quizzes, generate realistic midterm-style questions (MCQs, short answer, or dilemma case studies) and provide explanations.
5. If the information is not in the course materials, state that it isn't covered in their uploaded PDFs.

=== COURSE MATERIALS (KNOWLEDGE) ===
{knowledge_text}

=== CONVERSATION HISTORY ===
{history}

=== STUDENT QUESTION ===
{message}

Please provide a clear, structured study response. Conclude with a 'Referenced Sources' section listing the relevant slides/pages."""

    partial_message = ""
    try:
        for chunk in llm.stream(prompt):
            partial_message += chunk.content
            yield partial_message
    except Exception as e:
        yield f"Error generating response: {str(e)}\n\nMake sure your GROQ_API_KEY is correctly set in .env."

# Example study prompts for midterms
examples = [
    "What are the main ethical theories covered in the slides, and how do they differ?",
    "Generate 5 multiple-choice midterm exam questions with explanations from our PDFs.",
    "Explain the ACM and IEEE Code of Ethics and their core obligations for computing professionals.",
    "Give me an ethical dilemma case study (e.g. whistleblower or privacy issue) and analyze it step-by-step.",
    "What are the key topics and definitions most likely to be tested on the midterm?"
]

demo = gr.ChatInterface(
    stream_response,
    title="⚖️ Professional Ethics Midterm Prep Assistant (RAG)",
    description="Ask questions, generate practice midterm questions, and analyze ethical case studies based directly on your course PDFs.",
    textbox=gr.Textbox(placeholder="Ask anything about your ethics slides (e.g., 'Quiz me on Chapter 2', 'Explain Deontology vs Utilitarianism')...", scale=7),
    examples=examples,
)

if __name__ == "__main__":
    demo.launch(inbrowser=True)