# ⚖️ Professional Ethics Midterm Prep (RAG Chatbot)

A Retrieval-Augmented Generation (RAG) assistant designed for studying and preparing for Professional Ethics midterm examinations.

Powered by **Groq** (`llama-3.3-70b-versatile`), **FastEmbed** (`BAAI/bge-small-en-v1.5` running locally via ONNX), and **ChromaDB**.

## Features
- **Ground Truth Course Search**: Queries your 6 course lecture slides/notes and cites exact source files and page numbers.
- **Ethics Frameworks**: Built-in support for analyzing dilemmas using Utilitarianism, Deontology/Kantianism, Virtue Ethics, and Social Contract theory.
- **Code of Ethics Review**: Quick lookup and explanation of ACM, IEEE, and Software Engineering codes of ethics.
- **Exam Practice Mode**: Generates realistic midterm questions (MCQs, short-answer, and case analysis).
- **100% Free**: Uses free Groq API for inference and free local embeddings (no OpenAI API key required).

---

## Setup & Running

### 1. Create and Activate Virtual Environment
```powershell
py -m venv venv
.\venv\Scripts\Activate.ps1
```

### 2. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 3. Add Groq API Key
Copy `.env.example` to `.env` and set your key:
```env
GROQ_API_KEY="gsk_..."
```

### 4. Add Course PDFs
Place your 6 course PDFs inside the `data/` directory.

### 5. Ingest Database
Run the ingestion script to parse and embed the documents:
```powershell
python ingest_database.py
```

### 6. Launch the Assistant
Start the interactive Gradio web app:
```powershell
python chatbot.py
```
