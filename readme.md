# ⚖️ Ethica · Professional Ethics Midterm Prep Assistant (RAG)

An open-source, local-first **Retrieval-Augmented Generation (RAG)** study assistant built for university students preparing for their **Professional Ethics (CT-268)** midterm examination. 

Featuring an editorial paper-aesthetic web interface inspired by modern design systems, powered by **Groq** for high-speed LLM inference, **FastEmbed** for local zero-cost embeddings, **ChromaDB** for vector storage, and **FastAPI** for real-time streaming.

---

## ✨ Features

- **📚 Course-Grounded Retrieval**: Answers questions strictly based on uploaded course lecture slides, preventing hallucinations.
- **📄 Page-Level Citations**: Every response cites the exact source file and slide page number (e.g. `Week 4.pdf (p. 12)`).
- **🎨 Editorial Frontend**: Warm paper millimeter-grid background, serif typography (Newsreader), dark forest green accents, filter pills, search bar, and live countdown timer.
- **⚡ Real-Time Streaming**: Live token-by-token streaming responses via Server-Sent Events (SSE).
- **🧪 Practice Exam Generator**: Generate multiple-choice questions (MCQs), short-answer conceptual questions, and ethical dilemma scenarios.
- **💡 100% Free to Run**:
  - **Inference**: Uses Groq's free API (`qwen/qwen3.8-27b`).
  - **Embeddings**: Uses FastEmbed (`BAAI/bge-small-en-v1.5`) running locally on CPU via ONNX (no OpenAI key required, zero API costs).

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla HTML5, CSS3 (Editorial Grid System), Vanilla JS (Fetch SSE Streaming) |
| **Backend API** | FastAPI, Uvicorn, Python-dotenv |
| **Vector Database** | ChromaDB |
| **Embeddings** | FastEmbed (`BAAI/bge-small-en-v1.5` via ONNX Runtime) |
| **LLM Inference** | Groq (`qwen/qwen3.8-27b`) via `langchain-groq` |
| **Document Processing** | PyPDF, LangChain Text Splitters |

---

## 🚀 Quickstart Guide

Follow these steps to run the assistant locally on your computer:

### 1. Clone the Repository
```bash
git clone https://github.com/Ali-HF/professional-ethics-rag.git
cd professional-ethics-rag
```

### 2. Create and Activate a Virtual Environment

**Windows (PowerShell):**
```powershell
py -m venv venv
.\venv\Scripts\Activate.ps1
```

**macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Your Groq API Key
1. Get a free API key from **[Groq Console](https://console.groq.com/keys)**.
2. Create a `.env` file in the project root (or copy `.env.example`):
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and add your key:
   ```env
   GROQ_API_KEY="gsk_your_actual_groq_api_key_here"
   ```

### 5. Add Your Course PDFs
Place all your lecture slides / course PDFs inside the `data/` folder:
```text
data/
├── Week 1.pdf
├── Week 2.pdf
├── Week 3.pdf
├── Week 4.pdf
├── Week 5.pdf
└── Week 6.pdf
```
*(You can add as many PDFs as you like).*

### 6. Ingest the Slides into the Vector Database
Run the ingestion script to parse, chunk, and embed your PDFs into ChromaDB:
```bash
python ingest_database.py
```
This will create a local `chroma_db/` folder containing the indexed vector store.

### 7. Launch the Web Application
Start the FastAPI server:
```bash
python server.py
```
Open your browser and navigate to:
👉 **[http://localhost:7860](http://localhost:7860)**

*(Alternatively, you can run the minimal Gradio interface with `python chatbot.py`).*

---

## 📂 Project Structure

```text
├── data/                   # Course PDFs (Week 1 to Week 6)
├── chroma_db/              # Local Chroma vector database (created upon ingestion)
├── static/                 # Frontend assets (Banao-inspired editorial design)
│   ├── index.html          # Main web application layout
│   ├── style.css           # Design tokens, grid background, serif typography
│   ├── app.js              # Live search, filters, countdown, and SSE streaming
│   └── images/             # Module artwork & hero graphics
├── .env.example            # Environment variables template
├── ingest_database.py      # PDF loader, text splitter, and vector ingestion script
├── server.py               # FastAPI backend with /api/modules & /api/chat endpoints
├── chatbot.py              # Standalone Gradio chat interface
├── requirements.txt        # Python package dependencies
└── README.md               # Documentation & setup guide
```

---

## 🎯 Exam Prep Study Prompts

Here are useful prompts you can test in the study drawer:
- **Compare Theories**: *"Compare Utilitarianism, Kantian Duty Ethics, and Aristotle's Virtue Ethics with examples from our course slides."*
- **Practice Quiz**: *"Generate 5 tricky multiple-choice midterm exam questions covering Week 1 to Week 4, with detailed answer explanations."*
- **Case Studies**: *"Analyze the Challenger disaster and Therac-25 software failures from Week 2 from an engineering safety perspective."*
- **Techniques**: *"Walk me through the Line Drawing technique from Week 6 with a step-by-step dilemma analysis."*
- **High-Yield Review**: *"List the top 10 definitions and concepts most likely to be tested on the CT-268 midterm exam."*

---

## 🛡️ Privacy & Security
- All document chunking and vector embeddings run **100% locally** on your machine via FastEmbed.
- Your `.env` file containing API keys is excluded from version control via `.gitignore`.

---

## 📄 License
This project is licensed under the MIT License.
