from pydantic import BaseModel, EmailStr


class TakedownRequestIn(BaseModel):
    persona_id: str | None = None
    requester_name: str
    requester_email: EmailStr
    reason: str


class TakedownRequestOut(BaseModel):
    id: str
    status: str
    message: str


class TakedownRequestRecord(TakedownRequestIn):
    id: str
    status: str
    created_at: str
