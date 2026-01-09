import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas import AnalyzeRequestV2, AnalyzeResponseV2
from .orchestrator_v2 import run_analysis_v2
from .llm.provider import MockProvider, OpenAIProvider


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
    if provider == "openai":
        key = os.getenv("OPENAI_API_KEY", "").strip()
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
        if not key:
            # fall back to mock if key missing
            return MockProvider()
        return OpenAIProvider(api_key=key, model=model)

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
    
@app.post("/v2/analyze", response_model=AnalyzeResponseV2)
async def analyze_v2(req: AnalyzeRequestV2):
    try:
        llm = _get_llm()
        return await run_analysis_v2(req, llm)
    except KeyError as e:
        raise HTTPException(status_code=400, detail=str(e))
