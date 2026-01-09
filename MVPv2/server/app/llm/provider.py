from __future__ import annotations
import json
from typing import Any, Dict, Optional
from openai import AsyncOpenAI

class LLMProvider:
    """
    Interface for an LLM backend.

    MVP: we ship with a MockProvider so the full stack can run end-to-end.
    Later: implement OpenAI/Anthropic/local providers here.
    """

    async def generate_json(self, system_prompt: str, user_payload: str) -> Dict[str, Any]:
        """
        Returns a JSON object as a Python dict.
        The caller is responsible for validating it against Pydantic schemas.
        """
        
        raise NotImplementedError


class MockProvider(LLMProvider):
    """
    Heuristic mock. This is NOT intelligent—it's just enough to unblock UI + routing.
    """

    async def generate_json(self, system_prompt: str, user_payload: str) -> Dict[str, Any]:
        # Very simple branching to mimic Koi vs Fox modules
        if "goal_confidence" in system_prompt or "Fields: goal" in system_prompt or "goal," in system_prompt:
            return {
                "goal": "Clarify the objective and move the conversation to a concrete next step",
                "goal_confidence": 0.62,
                "topic_drift": 0.18,
                "missing_info": [
                    "Who is the counterpart and what is the relationship?",
                    "What is the exact outcome you want from this conversation?"
                ],
                "next_move": (
                    "Confirm the goal in one sentence, then ask a closed-ended next-step question "
                    "(e.g., 'If we agree the goal is X, can we lock Y today and I’ll deliver Z by Friday?')."
                ),
                "summary_so_far": [
                    "The context is incomplete. We should confirm the goal and the counterpart’s needs first."
                ],
            }

        # Fox/strategy output
        return {
            "detected_emotion": "neutral",
            "power_dynamic": "equal",
            "risk_flags": [
                "Your draft may be too vague and lacks a clear next step."
            ],
            "reply_options": [
                {
                    "tag": "Clearer",
                    "text": (
                        "I get your point. To align quickly, is our goal here X? "
                        "If yes, I suggest we confirm Y next so we can move forward."
                    ),
                    "why": "Align on the objective first, then propose a concrete step."
                },
                {
                    "tag": "Warmer",
                    "text": (
                        "Thanks for explaining. Just to make sure I’m following—are you mainly concerned about X? "
                        "If so, we can start with Y and take it step by step."
                    ),
                    "why": "De-escalates pressure while still progressing."
                },
                {
                    "tag": "More assertive",
                    "text": (
                        "My read is X. To keep momentum, let’s lock Y today—does that work for you?"
                    ),
                    "why": "Provides a frame and pushes toward a decision."
                },
            ],
        }
class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str, model: str):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model

    async def generate_json(self, system_prompt: str, user_payload: str) -> Dict[str, Any]:
        """
        Forces JSON-only output. If the model returns invalid JSON, we try one repair pass.
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_payload},
        ]

        # Ask for strict JSON object only
        resp = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.4,
            response_format={"type": "json_object"},
        )

        text = resp.choices[0].message.content or "{}"
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # One repair attempt
            repair_messages = messages + [
                {"role": "user", "content": "Your last output was not valid JSON. Return ONLY a valid JSON object, no extra text."}
            ]
            resp2 = await self.client.chat.completions.create(
                model=self.model,
                messages=repair_messages,
                temperature=0.0,
                response_format={"type": "json_object"},
            )
            text2 = resp2.choices[0].message.content or "{}"
            return json.loads(text2)