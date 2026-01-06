import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    PersonaItem,
    PersonaListResponse,
)
from .personas.registry import list_personas
from .orchestrator import run_analysis
from .llm.provider import MockProvider

load_dotenv()
# Fast API entrance
app = FastAPI(title="Koi & Fox MVP Server", version="0.1.0")

# Allow for Chrome extension, local dev to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # MVP: open; later restrict to chrome-extension://<id>
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_llm():
    provider = os.getenv("LLM_PROVIDER", "mock").lower()
    if provider == "mock":
        return MockProvider()

    # TODO: plug real providers here (OpenAI/Anthropic/local)
    # Choose my extension carefully
    return MockProvider()


@app.get("/personas", response_model=PersonaListResponse)
async def personas():
    items = []
    for p in list_personas():
        items.append(
            PersonaItem(
                id=p.id,
                name=p.name,
                module=p.module,  # should be "koi" or "fox"
                description=p.description,
            )
        )
    return PersonaListResponse(personas=items)


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    try:
        llm = _get_llm()
        return await run_analysis(req, llm)
    except KeyError as e:
        raise HTTPException(status_code=400, detail=str(e))
