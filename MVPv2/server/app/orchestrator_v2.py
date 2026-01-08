from .schemas import AnalyzeRequestV2, AnalyzeResponseV2, KoiOutputV2, FoxOutput
from .personas.registry import get_persona
from .llm.provider import LLMProvider


def _build_user_payload_v2(req: AnalyzeRequestV2) -> str:
    gs = req.goal_spec
    constraints = "\n".join([f"- {c}" for c in gs.constraints]) or "- (none)"
    criteria = "\n".join([f"- {c}" for c in gs.success_criteria]) or "- (none)"

    return (
        "=== EXPLICIT GOAL SPEC (USER-PROVIDED) ===\n"
        f"Goal: {gs.goal}\n"
        f"Goal Type: {gs.goal_type}\n"
        f"Relationship: {gs.relationship}\n"
        "Constraints:\n"
        f"{constraints}\n"
        "Success Criteria:\n"
        f"{criteria}\n\n"
        "=== Conversation Context ===\n"
        f"{req.conversation}\n\n"
        "=== User Draft ===\n"
        f"{req.user_draft}\n\n"
        "=== Preference Knobs ===\n"
        f"aggressiveness={req.aggressiveness}, interruptiveness={req.interruptiveness}, structure_strength={req.structure_strength}\n\n"
        "Return STRICT JSON only."
    )


async def run_analysis_v2(req: AnalyzeRequestV2, llm: LLMProvider) -> AnalyzeResponseV2:
    koi_persona = get_persona(req.koi_persona_id)
    fox_persona = get_persona(req.fox_persona_id)

    payload = _build_user_payload_v2(req)

    # IMPORTANT: prompts must instruct them to NOT invent goals
    koi_json = await llm.generate_json(koi_persona.system_prompt, payload)
    fox_json = await llm.generate_json(fox_persona.system_prompt, payload)

    koi_out = KoiOutputV2(**koi_json)
    fox_out = FoxOutput(**fox_json)

    return AnalyzeResponseV2(koi=koi_out, fox=fox_out)
