import os
import json
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from langchain_groq import ChatGroq
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_chroma import Chroma

# Load environment
load_dotenv()

app = FastAPI(title="Professional Ethics Midterm Prep Assistant")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CHROMA_PATH = r"chroma_db"

# Initialize local embedding model
print("Loading FastEmbed embeddings model...")
embeddings_model = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")

# Initialize ChromaDB vector store
print("Connecting to ChromaDB...")
vector_store = Chroma(
    collection_name="ethics_collection",
    embedding_function=embeddings_model,
    persist_directory=CHROMA_PATH,
)
retriever = vector_store.as_retriever(search_kwargs={"k": 5})

# Initialize Groq LLM
groq_key = os.getenv("GROQ_API_KEY")
if not groq_key:
    print("WARNING: GROQ_API_KEY is not set in .env")

PRIMARY_MODEL = "openai/gpt-oss-120b"
FALLBACK_MODEL = "openai/gpt-oss-20b"

llm = ChatGroq(
    model_name=PRIMARY_MODEL,
    temperature=0.3,
    max_tokens=1500,
    streaming=True
)

class KeyRequest(BaseModel):
    api_key: str

@app.get("/api/status")
def get_status():
    key = os.getenv("GROQ_API_KEY", "")
    is_valid = bool(key and key.startswith("gsk_") and not key.startswith("gsk_..."))
    return {"groq_configured": is_valid}

@app.post("/api/set-key")
def set_api_key(req: KeyRequest):
    global llm
    key = req.api_key.strip()
    if not key.startswith("gsk_"):
        raise HTTPException(status_code=400, detail="Invalid Groq API key format. Must start with 'gsk_'.")
    
    os.environ["GROQ_API_KEY"] = key
    with open(".env", "w") as f:
        f.write(f'GROQ_API_KEY="{key}"\n')
    
    llm = ChatGroq(
        model_name=PRIMARY_MODEL,
        api_key=key,
        temperature=0.3,
        max_tokens=1500,
        streaming=True
    )
    return {"success": True, "message": "Groq API key activated successfully!"}

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []
    week_filter: Optional[str] = None

# Course syllabus metadata for the 6 weeks
MODULES = [
    {
        "id": "week-1",
        "week": "Week 1",
        "category": "Foundations",
        "title": "Moral Foundations & Engineering Ethics",
        "institution": "Dept. of CS & IT · NED University",
        "instructor": "Huma Tabassum",
        "slides": "19 Slides",
        "image": "/images/week1.jpg",
        "description": "Distinctions between Morals, Ethics, and Law; Kohlberg's stages of moral development; core professional values for computing engineers.",
        "topics": ["Morals vs Ethics", "Kohlberg's Stages", "Law vs Ethics", "Engineering Values"],
        "prompt": "Summarize the core concepts of Week 1: Morals, Ethics, and Law, including Kohlberg's stages."
    },
    {
        "id": "week-2",
        "week": "Week 2",
        "category": "Risk & Safety",
        "title": "Professional Responsibilities, Risk & Safety",
        "institution": "Dept. of CS & IT · NED University",
        "instructor": "Huma Tabassum",
        "slides": "36 Slides",
        "image": "/images/week2.jpg",
        "description": "Engineering as social experimentation, safety standards, risk assessment, accountability, and catastrophic case studies (Challenger, Therac-25).",
        "topics": ["Social Experimentation", "Risk Assessment", "Safety Margins", "Challenger Case"],
        "prompt": "Explain Week 2 concepts: Engineering as social experimentation and how risk and safety are assessed."
    },
    {
        "id": "week-3",
        "week": "Week 3",
        "category": "Dilemmas",
        "title": "Moral Reasoning & Ethical Dilemma Resolution",
        "institution": "Dept. of CS & IT · NED University",
        "instructor": "Huma Tabassum",
        "slides": "21 Slides",
        "image": "/images/week3.jpg",
        "description": "Identifying moral dilemmas, vagueness, conflicting duties, disagreements, and multi-step frameworks for systematic ethical decision-making.",
        "topics": ["Moral Dilemmas", "Conflicting Reasons", "Moral Autonomy", "Resolution Steps"],
        "prompt": "What are moral dilemmas and the step-by-step techniques to resolve them according to Week 3?"
    },
    {
        "id": "week-4",
        "week": "Week 4",
        "category": "Theories I",
        "title": "Utilitarianism, Rights Ethics & Duty Ethics",
        "institution": "Dept. of CS & IT · NED University",
        "instructor": "Huma Tabassum",
        "slides": "25 Slides",
        "image": "/images/week4.jpg",
        "description": "Act vs Rule Utilitarianism, Cost-Benefit Analysis, Kant's Categorical Imperatives, Duty Ethics (Deontology), and Locke's fundamental rights.",
        "topics": ["Act vs Rule Utilitarianism", "Cost-Benefit Analysis", "Kantian Deontology", "Rights Ethics"],
        "prompt": "Compare Utilitarianism, Rights Ethics, and Kant's Duty Ethics in detail based on Week 4 slides."
    },
    {
        "id": "week-5",
        "week": "Week 5",
        "category": "Theories II",
        "title": "Virtue Ethics & Self-Realization Theories",
        "institution": "Dept. of CS & IT · NED University",
        "instructor": "Huma Tabassum",
        "slides": "27 Slides",
        "image": "/images/week5.jpg",
        "description": "Aristotle's Virtue Ethics, the Golden Mean doctrine, core virtues for computing professionals, self-realization, and ethical egoism critiques.",
        "topics": ["Aristotle Virtue Ethics", "The Golden Mean", "Professional Virtues", "Self-Realization"],
        "prompt": "Explain Virtue Ethics, Aristotle's Golden Mean, and Self-Realization Ethics from Week 5."
    },
    {
        "id": "week-6",
        "week": "Week 6",
        "category": "Problem-Solving",
        "title": "Ethical Problem Solving: Line Drawing & Flowcharts",
        "institution": "Dept. of CS & IT · NED University",
        "instructor": "Huma Tabassum",
        "slides": "18 Slides",
        "image": "/images/week6.jpg",
        "description": "Practical tools for real engineering dilemmas: Line Drawing technique between positive and negative paradigms, flowcharting, and bribery vs gifts analysis.",
        "topics": ["Line Drawing Method", "Flowcharting", "Bribery vs Gifts", "Paradigm Cases"],
        "prompt": "Explain the Line Drawing method and Flowcharting technique from Week 6 with a concrete case study."
    }
]

@app.get("/api/modules")
def get_modules():
    return MODULES

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Empty query")

    # Retrieve relevant document chunks
    query = message
    if request.week_filter and request.week_filter != "all":
        query = f"{request.week_filter} {query}"

    docs = retriever.invoke(query)

    # Extract source citation metadata
    sources = []
    knowledge_blocks = []
    seen = set()

    for doc in docs:
        source_name = os.path.basename(doc.metadata.get("source", "PDF"))
        page = doc.metadata.get("page", 0) + 1
        key = f"{source_name}-p{page}"
        if key not in seen:
            seen.add(key)
            snippet = doc.page_content.replace("\n", " ").strip()[:180] + "..."
            sources.append({
                "file": source_name,
                "page": page,
                "snippet": snippet
            })
        knowledge_blocks.append(f"[{source_name} - Page {page}]:\n{doc.page_content}")

    knowledge_text = "\n\n---\n\n".join(knowledge_blocks)

    # Format history
    history_text = ""
    for turn in request.history[-4:]:
        history_text += f"{turn.get('role', 'user').capitalize()}: {turn.get('content', '')}\n"

    prompt = f"""You are an expert tutor for CT-268: Professional Ethics at NED University (taught by Lecturer Huma Tabassum, Department of CS & IT).
You are helping an undergraduate student prepare for their midterm exam based strictly on their 6 lecture slides.

Ground your answers thoroughly in the provided course materials below.
- Clearly define concepts, frameworks, and theories.
- Use bullet points, bold key terms, and structured formatting.
- If asked for exam questions or practice MCQs, provide questions with correct answers and detailed explanations.
- Always conclude with a short "Referenced Lecture Slides" list noting the specific Week and Page numbers.

=== COURSE SLIDES KNOWLEDGE ===
{knowledge_text}

=== CONVERSATION HISTORY ===
{history_text}

=== STUDENT QUESTION ===
{message}

Helpful Midterm Exam Prep Answer:"""

    async def event_generator():
        # First send the citations/sources
        yield f"event: sources\ndata: {json.dumps(sources)}\n\n"
        await asyncio.sleep(0.02)

        try:
            # Stream tokens from primary model
            for chunk in llm.stream(prompt):
                if chunk.content:
                    payload = json.dumps({"token": chunk.content})
                    yield f"event: token\ndata: {payload}\n\n"
                    await asyncio.sleep(0.005)
        except Exception as e:
            print(f"Primary model stream error ({e}), retrying with fallback model {FALLBACK_MODEL}...")
            try:
                fallback_llm = ChatGroq(
                    model_name=FALLBACK_MODEL,
                    api_key=os.getenv("GROQ_API_KEY"),
                    temperature=0.3,
                    max_tokens=1000,
                    streaming=True
                )
                for chunk in fallback_llm.stream(prompt):
                    if chunk.content:
                        payload = json.dumps({"token": chunk.content})
                        yield f"event: token\ndata: {payload}\n\n"
                        await asyncio.sleep(0.005)
            except Exception as e2:
                err_payload = json.dumps({"error": f"Groq Error: {str(e2)}"})
                yield f"event: error\ndata: {err_payload}\n\n"

        yield "event: done\ndata: {}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

# Mount static folder
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=7860, reload=False)
