from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.notification import SystemNotification, NotificationType
from app.models.user import User
from app.models.project import Project, ProjectInterest


def create_notification(
    db: Session,
    type: NotificationType,
    actor: User | None = None,
    project: Project | None = None,
    interest: ProjectInterest | None = None,
) -> SystemNotification:
    actor_name = actor.full_name if actor else "System"
    project_title = project.title if project else ""

    messages = {
        NotificationType.USER_REGISTERED: f"Neuer Nutzer registriert: {actor_name}",
        NotificationType.PROJECT_CREATED: f"{actor_name} hat ein neues Projekt eingereicht: {project_title}",
        NotificationType.JOIN_REQUESTED: f"{actor_name} möchte am Projekt '{project_title}' teilnehmen",
        NotificationType.JOIN_ACCEPTED: f"Teilnahme von {actor_name} am Projekt '{project_title}' bestätigt",
        NotificationType.JOIN_REJECTED: f"Teilnahme von {actor_name} am Projekt '{project_title}' abgelehnt",
        NotificationType.PROJECT_APPROVED: f"Projekt '{project_title}' wurde akzeptiert",
        NotificationType.PROJECT_REJECTED: f"Projekt '{project_title}' wurde abgelehnt",
        NotificationType.PROJECT_STATUS_CHANGED: f"Projektstatus von '{project_title}' geändert",
        NotificationType.PARTICIPATION_WITHDRAWN: f"{actor_name} hat seine Teilnahme am Projekt '{project_title}' zurückgezogen",
        NotificationType.CHANGE_REQUESTED: f"{actor_name} hat eine Änderungsanfrage für '{project_title}' gesendet",
        NotificationType.REQUEST_ACCEPTED: f"Anfrage von {actor_name} für '{project_title}' wurde akzeptiert",
        NotificationType.REQUEST_REJECTED: f"Anfrage von {actor_name} für '{project_title}' wurde abgelehnt",
    }

    notification = SystemNotification(
        type=type,
        message=messages.get(type, "Systemaktion"),
        actor_id=actor.id if actor else None,
        project_id=project.id if project else None,
        interest_id=interest.id if interest else None,
        created_at=datetime.now(timezone.utc),
    )
    db.add(notification)
    # Don't commit here — caller commits
    return notification
