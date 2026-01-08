from .schemas import AnalyzeRequest, AnalyzeResponse, KoiOutput, FoxOutput
from .personas.registry import get_persona
from .llm.provider import LLMProvider


def _build_user_payload(req: AnalyzeRequest) -> str:
    """
    Build the unified user payload shared by KOI and FOX.
    """
    return (
        "=== Conversation Context ===\n"
        f"{req.conversation}\n\n"
        "=== User Draft ===\n"
        f"{req.user_draft}\n\n"
        "=== Preference Knobs ===\n"
        f"aggressiveness={req.aggressiveness}, "
        f"interruptiveness={req.interruptiveness}, "
        f"structure_strength={req.structure_strength}\n\n"
        "Return STRICT JSON only."
    )


async def run_analysis(req: AnalyzeRequest, llm: LLMProvider) -> AnalyzeResponse:
    """
    Orchestrates KOI (direction/goal) + FOX (strategy/tone) and merges outputs.
    """
    koi_persona = get_persona(req.koi_persona_id)
    fox_persona = get_persona(req.fox_persona_id)

    payload = _build_user_payload(req)

    koi_json = await llm.generate_json(koi_persona.system_prompt, payload)
    fox_json = await llm.generate_json(fox_persona.system_prompt, payload)

    # Validate shapes via Pydantic models
    koi_out = KoiOutput(**koi_json)
    fox_out = FoxOutput(**fox_json)

    return AnalyzeResponse(koi=koi_out, fox=fox_out)
