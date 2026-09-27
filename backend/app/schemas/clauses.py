from pydantic import BaseModel, ConfigDict


class ClauseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    parent_id: str | None
    number: str
    title: str | None
    text: str
    path: str
    depth: int
    page_number: int
    order_index: int
