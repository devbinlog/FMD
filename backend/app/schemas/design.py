import uuid
from typing import Literal

from pydantic import BaseModel, model_validator


class DesignCreate(BaseModel):
    session_id: uuid.UUID
    input_mode: Literal["text", "canvas"]
    category_hint: str | None = None
    text_prompt: str | None = None
    canvas_data: str | None = None  # base64 image data

    @model_validator(mode="after")
    def validate_input(self):
        if not self.text_prompt and not self.canvas_data:
            raise ValueError("Either text_prompt or canvas_data must be provided")
        return self


class DesignResponse(BaseModel):
    design_id: uuid.UUID
    status: str


class ProcessResponse(BaseModel):
    job_id: uuid.UUID
    status: str
