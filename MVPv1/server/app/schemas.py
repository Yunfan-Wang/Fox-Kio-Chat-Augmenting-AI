from pydantic import BaseModel, Field
from typing import List, Literal


class AnalyzeRequest(BaseModel):
    session_id: str = Field(default="demo")
    conversation: str = Field(..., description="Recent conversation context (pasted by user)")
    user_draft: str = Field(..., description="User's message draft to be optimized")

    # NOTE: carp -> koi
    koi_persona_id: str = Field(..., description="Koi persona id (goal/direction)")
    fox_persona_id: str = Field(..., description="Fox persona id (strategy/tone)")

    aggressiveness: float = Field(default=0.5, ge=0.0, le=1.0)
    interruptiveness: float = Field(default=0.3, ge=0.0, le=1.0)
    structure_strength: float = Field(default=0.6, ge=0.0, le=1.0)


class KoiOutput(BaseModel):
    goal: str
    goal_confidence: float
    topic_drift: float
    missing_info: List[str]
    next_move: str
    summary_so_far: List[str]


class ReplyOption(BaseModel):
    tag: str
    text: str
    why: str


class FoxOutput(BaseModel):
    detected_emotion: str
    power_dynamic: str
    risk_flags: List[str]
    reply_options: List[ReplyOption]


class AnalyzeResponse(BaseModel):
    koi: KoiOutput
    fox: FoxOutput


class PersonaItem(BaseModel):
    id: str
    name: str
    module: Literal["koi", "fox"]
    description: str


class PersonaListResponse(BaseModel):
    personas: List[PersonaItem]
