from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    database_host: str
    database_port: int
    database_name: str
    database_user: str
    database_password: str

    secret_key: str

    @property
    def database_url(self) -> str:
        # Construye la URL exacta que SQLAlchemy necesita
        return f"postgresql+psycopg://{self.database_user}:{self.database_password}@{self.database_host}:{self.database_port}/{self.database_name}"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


settings = Settings()