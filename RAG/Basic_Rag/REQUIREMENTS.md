# RAG Explorer – Project Requirements

## Objective

Build a React-based web application that demonstrates the complete Retrieval-Augmented Generation (RAG) pipeline visually. The goal is to help users understand how document ingestion, embedding generation, vector storage, retrieval, and LLM response generation work together.

## Functional Requirements

### 1. PDF Ingestion

The application should monitor the `data/pdf` folder.

Whenever a PDF is added to this folder, the system should automatically:

- Read the PDF.
- Extract its text.
- Split the content into meaningful chunks.
- Generate embeddings for each chunk using the Nomic Embed embedding model.
- Store the generated embeddings along with metadata in a local ChromaDB instance.

No manual ingestion should be required.

### 2. Vector Database

Use ChromaDB (Local) as the vector database.

For each chunk, store:

- Chunk ID
- Chunk text
- Source PDF name
- Page number (if available)
- Embedding vector

### 3. Query Interface

Create a React UI where users can:

- Enter a natural language question.
- Submit the query.
- Retrieve relevant chunks from ChromaDB.

### 4. Retrieval Visualization

When a query is submitted, display:

**User Query**

Example: `What is the leave policy?`

**Top 4 Retrieved Chunks**

Display the four most relevant chunks retrieved from ChromaDB.

Each chunk should include:

- Chunk Number
- Similarity Score
- Source PDF
- Page Number
- Chunk Content

Example:

```
Chunk #12
Similarity: 0.92

Source: Employee_Handbook.pdf
Page: 17

Content: Employees are entitled to 24 annual leaves per calendar year...
```

This visualization should clearly demonstrate how semantic retrieval works.

### 5. LLM Response Generation

After retrieving the top 4 chunks:

- Pass the retrieved chunks as context to the LLM.
- Use Groq API for inference.
- Use the OpenGPT 1.2 120B model (or another supported Groq model if unavailable).
- Generate a final answer grounded only in the retrieved context.

### 6. Final UI Layout

The application should display four sections:

**Left Panel — PDF Information**
- Uploaded PDF
- Number of Pages
- Number of Chunks
- Embedding Model Used
- Vector Database Status

**Top Center — User Query**
- e.g. "What is the annual leave policy?"

**Bottom Center — Retrieved Chunks**
- Top 4 Chunks with Similarity Score, Source, Page Number, Chunk Content

**Right Panel — LLM Response**
- Final answer generated using the retrieved context

## Tech Stack

**Frontend**
- React
- Tailwind CSS
- Vite

**Backend**
- FastAPI (preferred) or Node.js
- LangChain

**Embedding Model**
- Nomic Embed

**Vector Database**
- Local ChromaDB

**LLM**
- Groq API
- OpenGPT 1.2 120B (or equivalent Groq-supported model)

## Expected RAG Flow

```
PDF
  ↓
Text Extraction
  ↓
Chunking
  ↓
Nomic Embeddings
  ↓
ChromaDB (Local)
  ↓
User Query
  ↓
Query Embedding
  ↓
Similarity Search
  ↓
Top 4 Chunks
  ↓
Groq LLM
  ↓
Final Response
```

## Sample Ingestion Document

`Product Requirements Document_(PRD)_VWO.com.pdf` (in this folder) — VWO Digital Experience Optimization Platform PRD. Used as the sample PDF to drop into `data/pdf` and exercise the full ingestion → embedding → retrieval → LLM-answer pipeline end to end (e.g. query "What is SmartStats?" or "What are the functional requirements?").

## Educational Goal

The application should act as a RAG Explorer, allowing users to visually understand every stage of the Retrieval-Augmented Generation pipeline.

The UI should clearly demonstrate:

- How PDFs are ingested.
- How documents are chunked.
- How embeddings are generated.
- How vectors are stored in ChromaDB.
- How semantic search retrieves relevant chunks.
- Which chunks are sent to the LLM.
- How the LLM generates a context-aware response using the retrieved information.

The emphasis is on transparency and learning, so users can observe each step of the RAG process rather than treating it as a black box.
