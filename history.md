# 📜 Project History & Engineering Decision Journal

This document tracks the chronological sequence of problems encountered, diagnostic commands executed, architectural decisions made, and rationale for every modification in the **Ethica · CT-268 Professional Ethics Midterm Prep Assistant (RAG)** project.

---

## 📅 Timeline & Sequential Log

---

### Step 1: Initial Repository Cloning
- **Developer**: Ali Hasan (@Ali-HF)
- **Goal**: Initialize a baseline LangChain RAG prototype for building a specialized Professional Ethics course assistant.
- **Result**: Successfully established the project structure in `D:\vibes\rag PE`.

---

### Step 2: Virtual Environment & Dependency Installation Failures
- **Encountered Issues**:
  1. **DNS/Network Error**:
     ```text
     [Errno 11001] getaddrinfo failed - Failed to establish a new connection: /simple/aiofiles/
     ```
     *Diagnosis*: Temporary network interruption or DNS failure prevented `pip` from reaching `pypi.org`.
  
  2. **Venv Script Path Mismatch (`bin` vs `Scripts`)**:
     - Running `.\venv\Scripts\Activate.ps1` failed with `CommandNotFoundException`.
     - *Diagnosis*: Inspection revealed the virtual environment had a `bin` folder instead of `Scripts` because the initial Python executable was called via an MSYS2/UCRT64 binary (`C:\msys64\ucrt64\bin\python.exe`) rather than the native Windows Python interpreter.
  
  3. **Python 3.12 Missing**:
     - User attempted: `py -3.12 -m venv venv`.
     - *Diagnosis*: `py -0` showed only Python 3.13 was installed (`-V:3.13 * Python 3.13 (64-bit)`).
  
  4. **C++ Compilation Failure (`chroma-hnswlib`)**:
     ```text
     ERROR: Failed building wheel for chroma-hnswlib
     ERROR: Failed to build installable wheels for some pyproject.toml based projects (chroma-hnswlib)
     ```
     *Diagnosis*: The repository's original `requirements.txt` froze strict legacy pins (`chroma-hnswlib==0.7.6`, `chromadb==0.6.3`) which do not have precompiled binary wheels for Python 3.13 on Windows, triggering a compilation attempt that failed due to absent Microsoft Visual C++ Build Tools.

- **Solution & Architectural Decision**:
  - Completely recreated a clean Windows virtual environment targeting native Python 3.13:
    ```powershell
    Remove-Item -Recurse -Force 'venv'
    py -m venv venv
    ```
  - Unpinned legacy dependencies in favor of modern packages with precompiled universal ABI3 wheels (`chromadb>=1.5.0`, `langchain-chroma>=1.1.0`), eliminating the need for any C++ compiler on the student's machine.

---

### Step 3: Migration from Paid OpenAI to Free Groq + Local FastEmbed
- **Context**: The original repository relied strictly on `OpenAIEmbeddings` (`text-embedding-3-large`) and `ChatOpenAI` (`gpt-4o-mini`), requiring a paid OpenAI subscription and API key.
- **User Constraint**: The user did not possess an OpenAI key, but had a free Groq API key.
- **Architectural Analysis**:
  - **Chat LLM**: Groq provides ultra-fast inference with free tier access.
  - **Embeddings**: Groq is an inference-only engine and does **not** provide an embedding API.
  - **Options Evaluated**:
    1. *Cloud-based Free APIs (HuggingFace Inference, Gemini)*: Dependent on external network calls and rate limits.
    2. *Local SentenceTransformers (PyTorch)*: Requires multi-gigabyte PyTorch installation.
    3. *FastEmbed (`BAAI/bge-small-en-v1.5` via ONNX)*: **Selected**.
- **Why FastEmbed was Chosen**:
  - Extremely lightweight (~120 MB quantized ONNX model).
  - Runs 100% locally on CPU with zero latency, zero cost, and zero API limits.
  - Does not require a paid credit card, external API key, or PyTorch.
- **Commands Executed**:
  ```powershell
  .\venv\Scripts\pip install langchain-groq fastembed
  ```

---

### Step 4: Resolving the Groq Model 404 Error
- **Problem**: When sending queries to `llama-3.3-70b-versatile`, Groq returned:
  ```text
  Error code: 404 - {'error': {'message': 'The model `llama-3.3-70b-versatile` does not exist or you do not have access to it.'}}
  ```
- **Investigation**: We executed a script inspecting the exact model IDs available to the user's Groq key:
  ```python
  import groq, dotenv; dotenv.load_dotenv()
  client = groq.Groq()
  print([m.id for m in client.models.list().data])
  ```
  *Result*: Active models included `qwen/qwen3.8-27b`, `openai/gpt-oss-120b`, and `openai/gpt-oss-20b`.
- **Decision & Benchmark**:
  - Tested `qwen/qwen3.8-27b`: Responded in ~1.8 seconds with exceptional ethical reasoning and exam explanation quality.
  - Updated `chatbot.py` and `server.py` to use `qwen/qwen3.8-27b`.

---

### Step 5: Course Syllabus Customization (CT-268 Professional Ethics)
- **Domain**: CT-268 Professional Ethics, Lecturer Huma Tabassum, Department of CS & IT, NED University of Engineering & Technology.
- **Course Documents Added to `data/`**:
  - `Week 1.pdf`: Moral Foundations, Morals vs Ethics vs Law, Kohlberg's Stages.
  - `Week 2.pdf`: Professional Responsibilities, Risk, Safety, Challenger & Therac-25 Case Studies.
  - `Week 3.pdf`: Moral Reasoning & Ethical Dilemma Resolution.
  - `Week 4.pdf`: Moral Theories I (Utilitarianism, Rights Ethics, Kantian Deontology).
  - `Week 5.pdf`: Moral Theories II (Aristotelian Virtue Ethics, Golden Mean, Self-Realization).
  - `Week 6.pdf`: Ethical Problem Solving (Line Drawing Method, Flowcharting).
- **Ingestion Pipeline**:
  - Executed `ingest_database.py`.
  - Scanned 6 PDFs, extracted **146 lecture pages**, and produced **199 vector chunks** stored in `chroma_db/`.

---

### Step 6: Initial Editorial UI/UX Prototype
- **Design Process**: Created an editorial card frontend and installed the `ui-ux-pro-max` skill.
- **Skill Installation**:
  - Installed `ui-ux-pro-max` via CLI:
    ```powershell
    npx -y ui-ux-pro-max-cli init --ai antigravity
    ```
  - Resulted in `.agents/skills/ui-ux-pro-max`.
- **Visual Design Decisions**:
  - **Background**: Warm editorial cream (`#faf8f5`) with millimeter graph-paper grid lines (`rgba(23, 52, 38, 0.055)`).
  - **Typography**: Editorial serif heading font (`Newsreader`) combined with modern sans-serif (`Plus Jakarta Sans`) and monospace (`JetBrains Mono`).
  - **Color Palette**: Deep forest green (`#163326`) for primary interactive controls, sand gold (`#c89b3c`) for badges and highlights.
  - **Header Layout**: Logo with gold dot (`Ethica.`), course badge (`CT-268`), bold headline (*"Master your Ethics."*), and a dark forest green countdown card.
  - **Search & Filters**: Search bar with real-time text matching, domain dropdown, and filter pills (`All weeks`, `Week 1` ... `Week 6`).
  - **Card System**: 6 individual module cards featuring AI-generated illustrations, topic badges, slide counts, and direct action triggers.
  - **Sticky Bottom Action Bar**: Sticky green bar offering a 1-click trigger to generate a full midterm practice quiz.
  - **Sliding Study Drawer**: Real-time token streaming via Server-Sent Events (SSE) with clickable source citations indicating the exact slide file and page number.

---

### Step 7: Transition to Local-First & 1-Click Classmate Experience
- **User Request**: Ensure classmates can clone the repository and run the entire application with a single click, without having to configure complex Python environments or terminal commands.
- **Implementations**:
  1. **`start.bat` (Windows 1-Click Launcher)**:
     - Automatically verifies Python installation.
     - Creates the virtual environment if absent.
     - Silently installs all requirements from `requirements.txt`.
     - Prompts for a Groq API key in the terminal if `.env` is unconfigured.
     - Indexes the included course PDFs into `chroma_db` if not already present.
     - Launches `server.py` and opens `http://localhost:7860` in the user's default browser automatically.
  2. **`start.sh` (macOS / Linux 1-Click Launcher)**:
     - Equivalent automated setup for Unix platforms.
  3. **In-App API Key Manager**:
     - Built `GET /api/status` and `POST /api/set-key` endpoints in `server.py`.
     - Added an **API Key** button with a live status indicator (green pulse if configured, yellow if missing) to the navigation bar.
     - Integrated a modal dialog in `static/index.html` allowing students to paste and activate their Groq API key directly in the browser with zero server restarts.
  4. **GitHub Documentation (`README.md`)**:
     - Comprehensive documentation detailing 1-click execution, architectural layer breakdown, course topics, and study prompts.

---

### Step 8: Version Control & GitHub Repository
- **Remote Setup**:
  - Removed original tutorial remote:
    ```powershell
    git remote remove origin
    ```
  - Created private GitHub repository and pushed all project artifacts:
    ```powershell
    gh repo create professional-ethics-rag --private --source=. --remote=origin --push
    ```
  - **Repository URL**: `https://github.com/Ali-HF/professional-ethics-rag`

---

### Step 9: Design Evolution to 21st.dev & Framer Motion
- **User Request**: Clean up the UI from being too graphic-heavy and dense; shift to a simplistic, modern aesthetic inspired by **21st.dev** and integrate **Framer Motion**.
- **Problems with Previous Layout**:
  - Bulky stock-style illustration headers on every card added visual noise without contributing to studying.
  - Excessive badges, countdown tickers, and multi-tier toolbars cluttered the student's focus.
  - Page felt information-heavy rather than intuitive.
- **Architectural & Aesthetic Shift**:
  1. **Visual Language (21st.dev / Linear style)**:
     - Shifted from warm cream graph-paper to an ultra-modern dark obsidian backdrop (`#09090b`), subtle ambient radial glow, and refined micro-borders (`rgba(255, 255, 255, 0.08)`).
     - Clean typography using `Geist` and `Geist Mono`.
  2. **Interaction Design (Spotlight Command Bar)**:
     - Replaced cluttered search rows with a centralized spotlight command bar featuring keyboard shortcuts (`Enter ↵`, `Ctrl + K` focus).
     - Added popular prompt chips directly below the search bar for instant study queries.
  3. **Bento Grid Architecture**:
     - Stripped away bloated images in favor of clean, information-dense Bento cards with week indicators, slide counts, key topic tags, and direct `Study Guide` / `⚡ Quiz Me` action triggers.
  4. **Framer Motion Integration**:
     - Embedded the standalone `Motion` browser bundle (`motion@11.11.17`).
     - Implemented staggered spring entrance animations (`stagger(0.08)`, spring stiffness 220) for hero elements and cards on initial load and category filtering.
     - Smooth spring drawer transitions and tactile button micro-interactions.

---

### Step 10: Claude-Inspired Interface & Left Module Sidebar
- **User Request**: Redesign the interface to feel like **Claude (Anthropic)**, moving the course modules into a persistent navigation bar on the left.
- **Architectural & Layout Shift**:
  1. **Claude-Style App Shell**:
     - Divided workspace into a persistent collapsible left sidebar (`width: 280px`) and an expansive, centered main chat canvas.
     - Palette: Warm obsidian charcoal (`#181716` to `#242321`) accented with Claude's signature terracotta (`#d97757`) and serif headings (`Newsreader`).
  2. **Left Sidebar (Modules & Scope Navigator)**:
     - Houses all 6 course lecture modules (`Week 1` through `Week 6`) with slide counts and week tags.
     - Clicking any module dynamically scopes the RAG study queries to that specific week and displays an active context indicator in the top bar.
     - Hovering reveals instant micro-actions: `Study` (summarizes key concepts) and `Quiz` (generates 3 exam questions).
     - Includes `+ New Study Session` to reset context, Groq API key indicator, and GitHub link.
  3. **Central Chat Workspace**:
     - Claude-inspired welcoming empty state: *"How can I help you study today?"* with 4 quick suggestion cards for common midterm prep tasks.
     - Centered message thread (`max-width: 760px`) with generous line spacing, distinct user bubbles, and clean slide citation pills (`📄 Week 4.pdf (p. 12)`).
     - Claude-style floating bottom input dock with auto-expanding textarea, keyboard hints (`Enter ↵` to send, `Shift + Enter` for new lines), and terracotta send button.

---

### Step 11: Sharp Non-Vibecoded Geometry & Color Scheme Reversion
- **User Request**: Keep the Claude-inspired two-pane layout, but remove the "vibecoded" bubbly rounded corners entirely (strict straight edges), and restore the popular warm cream millimeter-grid, deep forest green, and sand gold color scheme along with the original artwork assets.
- **Architectural & Design Adjustments**:
  1. **Brutalist / Sharp Editorial Geometry**:
     - Stripped all `border-radius` (enforced `border-radius: 0px !important;` globally).
     - Cards, buttons, inputs, modals, badges, and sidebar items now feature sharp, architectural, hairline borders (`1px solid`).
     - Eliminates the generic "AI skin" feel in favor of a timeless, bespoke academic/editorial atmosphere.
  2. **Palette Reversion**:
     - Background: Restored the signature warm cream paper (`#faf8f5`) with millimeter graph-paper grid lines (`rgba(22, 51, 38, 0.055)`).
     - Sidebar: Warm linen tone (`#f0ebe2`) with a hairline right border.
     - Primary Interactive Color: Deep Forest Green (`#163326`).
     - Accent: Sand Gold (`#c89b3c`) for square badges (`■`), tags, and citation markers.
  3. **Asset Reintegration**:
     - Embedded the original visual assets (`hero.jpg`, `week4.jpg`, `week6.jpg`, `week2.jpg`) into the suggestion cards with sharp rectangular framing.

---

### Step 12: Forest Obsidian Noir Dark Theme & Theme Toggle
- **User Request**: *"give a tdark theme too"*
- **Implementation & Architectural Decisions**:
  1. **Dual-Theme Token System**:
     - Light Mode: Warm Cream (`#faf8f5`), Deep Forest Green (`#163326`), Sand Gold (`#c89b3c`).
     - Dark Mode (`[data-theme="dark"]`): Deep Forest Obsidian (`#0d1410`), Emerald Green (`#34d399` / `#22c55e`), Bright Gold (`#e5b960`), and subtle white-grid lines.
  2. **Zero-Radius Brutalist Consistency**:
     - Dark theme strictly retains `border-radius: 0px !important;` across all components (sidebar, chat cards, input dock, buttons, and modals).
  3. **Theme Switcher UI**:
     - Added `#themeToggleBtn` in the top right header navigation bar next to the model badge.
     - Displays `🌙 DARK` in light mode and `☀️ LIGHT` in dark mode.
     - Automatically persists the student's theme preference in browser `localStorage` (`ethica-theme`).

---

### Step 13: Cream White, White Beige, and Architectural Black (Low Eye-Fatigue Palette)
- **User Request**: *"its still too much heavy opn the eyes, lets change themes too cream whitew, white beighe and black"*
- **Motivation & Root Cause**:
  - The previous forest green hues (`#163326`) and saturated green dark mode elements created visual heaviness and eye strain during sustained reading.
  - The user sought a calmer, Scandinavian/editorial neutral palette centered strictly around **Cream White**, **White Beige**, and **Architectural Black**.
- **Implementation & Palette Evolution**:
  1. **Light Mode**:
     - **Canvas / Paper**: Calming Cream White (`#fcfbf9`) with an ultra-subtle, airy neutral millimeter grid (`rgba(0, 0, 0, 0.032)`).
     - **Sidebar & Secondary Surfaces**: Soft White Beige / Linen (`#f5f2eb` / `#eae4d9`).
     - **Cards & Inputs**: Pure crisp White (`#ffffff`) with hairline neutral borders (`rgba(0, 0, 0, 0.08)`).
     - **Primary Action & Typography**: Deep Architectural Black (`#18181b`) for buttons (`.new-chat-btn`, `.editorial-send-btn`), user speech bubbles, and headers.
     - **Accent Highlights**: Refined, muted Sand Gold (`#a38242`) for week badges and citation pills.
  2. **Dark Mode (`[data-theme="dark"]`)**:
     - Soft matte obsidian charcoal (`#121212`), eliminating harsh saturated greens.
     - Gentle cream white text (`#f4f4f5`) and muted warm-beige gold accents (`#d5be8a`).
  3. **Zero-Radius Retained**:
     - Enforced `border-radius: 0px !important;` globally.

---

## 📌 Summary of Core Decisions

| Decision | Selected Choice | Rejected Alternative | Primary Reason |
|---|---|---|---|
| **Color Palette** | Cream White + White Beige + Architectural Black | Saturated Forest Green / Neon Emerald | Maximum legibility, serene reading comfort, zero eye fatigue. |
| **Theme System** | Dual Theme (Cream White Light + Matte Obsidian Dark) | Single-theme | Effortless day and night exam studying with `localStorage` persistence. |
| **Layout Shell** | Claude-style (Left Modules Sidebar + Central Chat) | Dashboard Cards / Modals | Best user flow for sequential learning and deep reading. |
| **Geometry** | Sharp Rectangular (`border-radius: 0px`) | Rounded "Vibecoded" Pills | Elegant, architectural, academic precision without generic AI bubbly curves. |
| **Embedding Engine** | FastEmbed (`bge-small-en-v1.5`) | OpenAI Embeddings | Zero cost, runs 100% locally on CPU, no paid API key required. |
| **Inference LLM** | Groq (`qwen/qwen3.8-27b`) | OpenAI `gpt-4o-mini` | Blazing fast inference (~2s response), free API access, available on user's key. |
| **Backend Framework** | FastAPI + Uvicorn | Pure Gradio | Full control over custom editorial HTML/CSS design, SSE token streaming, and API key management. |
| **Student UX** | `start.bat` & Web Key Modal | Manual terminal commands | Enables non-technical classmates to run the RAG system by double-clicking a single file. |



