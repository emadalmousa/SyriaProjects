import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


class EmailService:
    def send_verification_email(self, email: str, token: str) -> None:
        link = f"{settings.frontend_url}/{settings.frontend_default_locale}/verify-email?token={token}"
        subject = "E-Mail-Adresse bestätigen – SyriaProjects"
        html = f"""
        <p>Willkommen bei SyriaProjects!</p>
        <p>Bitte bestätige deine E-Mail-Adresse:</p>
        <p><a href="{link}">{link}</a></p>
        <p>Der Link ist 24 Stunden gültig.</p>
        """
        self._send(email, subject, html)

    def send_password_reset_email(self, email: str, token: str) -> None:
        link = f"{settings.frontend_url}/{settings.frontend_default_locale}/reset-password?token={token}"
        subject = "Passwort zurücksetzen – SyriaProjects"
        html = f"""
        <p>Du hast eine Anfrage zum Zurücksetzen deines Passworts gesendet.</p>
        <p>Klicke hier, um dein Passwort zurückzusetzen:</p>
        <p><a href="{link}">{link}</a></p>
        <p>Der Link ist 60 Minuten gültig. Falls du keine Anfrage gestellt hast, ignoriere diese E-Mail.</p>
        """
        self._send(email, subject, html)

    def _send(self, to: str, subject: str, html: str) -> None:
        if settings.email_console_mode:
            print(f"\n[EMAIL] To: {to} | Subject: {subject}\n{html}\n")
            return

        if settings.resend_api_key:
            self._send_resend(to, subject, html)
        else:
            self._send_smtp(to, subject, html)

    def _send_resend(self, to: str, subject: str, html: str) -> None:
        import resend
        resend.api_key = settings.resend_api_key
        resend.Emails.send({
            "from": settings.smtp_from,
            "to": to,
            "subject": subject,
            "html": html,
        })

    def _send_smtp(self, to: str, subject: str, html: str) -> None:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.smtp_from
        msg["To"] = to
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            if settings.smtp_tls:
                server.starttls()
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_from, to, msg.as_string())


def get_email_service() -> EmailService:
    return EmailService()
