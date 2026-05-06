from pydantic import BaseModel


class DashboardStatsResponse(BaseModel):
    pending_contributions: int
    reported_items: int
    new_messages: int
    total_users: int
    ai_messages_today: int
    approved_data: int
