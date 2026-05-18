from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url:      str
    jwt_secret:        str
    jwt_algorithm:     str = "HS256"
    jwt_expire_hours:  int = 8
    allow_checkin_outside_window: bool = False

    def __init__(self, **values):
        super().__init__(**values)
        if self.database_url and self.database_url.startswith("postgres://"):
            self.database_url = self.database_url.replace("postgres://", "postgresql://", 1)

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()