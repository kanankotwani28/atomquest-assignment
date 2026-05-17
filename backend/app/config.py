from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url:      str
    jwt_secret:        str
    jwt_algorithm:     str = "HS256"
    jwt_expire_hours:  int = 8
    allow_checkin_outside_window: bool = False

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()