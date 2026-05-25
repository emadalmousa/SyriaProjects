from app.core.database import Base, engine
from app.models import user, project  # noqa: F401


def init():
    Base.metadata.create_all(bind=engine)
    print("Database tables ready.")


if __name__ == "__main__":
    init()
