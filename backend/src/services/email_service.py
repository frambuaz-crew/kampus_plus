"""Email service for sending verification and notification emails.

This module provides:
- Email sending via SMTP
- HTML email templates for verification and password reset
- Error handling and logging
- Support for both verification and password reset emails
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from typing import Optional
from datetime import datetime

import logging

from src.core.config import get_settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via SMTP.
    
    Supports:
    - Single SMTP server for all universities (recommended: SendGrid/AWS SES)
    - University-specific SMTP servers (optional, via config)
    """
    
    def __init__(self):
        """Initialize email service with settings."""
        self.settings = get_settings()
        self.smtp_host = self.settings.smtp_host
        self.smtp_port = self.settings.smtp_port
        self.smtp_user = self.settings.smtp_user
        self.smtp_password = self.settings.smtp_password
        self.from_email = self.settings.smtp_from_email
        self.from_name = self.settings.smtp_from_name
        self.support_email = self.settings.support_email
        
        # Parse university-specific SMTP config if provided
        self.university_smtp_map: dict[str, dict] = {}
        if hasattr(self.settings, 'university_smtp_config') and self.settings.university_smtp_config:
            self._parse_university_smtp_config()
    
    def _parse_university_smtp_config(self):
        """Parse university-specific SMTP configuration.
        
        Format: domain1:host:port:user:password|domain2:host:port:user:password
        Example: ogr.selcuk.edu.tr:mailgateway.selcuk.edu.tr:587:noreply@selcuk.edu.tr:pass123
        """
        try:
            configs = self.settings.university_smtp_config.split('|')
            for config in configs:
                parts = config.strip().split(':')
                if len(parts) == 5:
                    domain, host, port, user, password = parts
                    self.university_smtp_map[domain.lower()] = {
                        'host': host,
                        'port': int(port),
                        'user': user,
                        'password': password
                    }
        except Exception as e:
            logger.warning(f"Failed to parse university SMTP config: {e}")
    
    def _get_smtp_config_for_domain(self, email_domain: str) -> dict:
        """Get SMTP configuration for specific email domain.
        
        Args:
            email_domain: Email domain (e.g., 'ogr.selcuk.edu.tr')
            
        Returns:
            Dictionary with SMTP config (host, port, user, password, from_email)
        """
        # Check if university-specific config exists
        if email_domain.lower() in self.university_smtp_map:
            config = self.university_smtp_map[email_domain.lower()]
            return {
                'host': config['host'],
                'port': config['port'],
                'user': config['user'],
                'password': config['password'],
                'from_email': config['user'],  # Use SMTP user as from_email
            }
        
        # Use default SMTP config
        return {
            'host': self.smtp_host,
            'port': self.smtp_port,
            'user': self.smtp_user,
            'password': self.smtp_password,
            'from_email': self.from_email,
        }
    
    def _create_verification_email_html(self, verification_url: str, user_name: str) -> str:
        """Create HTML email template for email verification.
        
        Args:
            verification_url: Full URL with verification token
            user_name: User's first name
            
        Returns:
            HTML email content
        """
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification - KAMPÜS+</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">KAMPÜS+ Platform</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #667eea; margin-top: 0;">Email Doğrulama</h2>
        
        <p>Merhaba {user_name},</p>
        
        <p>KAMPÜS+ platformuna kaydolduğunuz için teşekkür ederiz! Hesabınızı aktifleştirmek için aşağıdaki butona tıklayarak email adresinizi doğrulayın.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{verification_url}" 
               style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Email Adresimi Doğrula
            </a>
        </div>
        
        <p style="font-size: 12px; color: #666; margin-top: 30px;">
            <strong>Not:</strong> Bu link 24 saat içinde geçerlidir. Eğer buton çalışmıyorsa, aşağıdaki linki tarayıcınıza kopyalayıp yapıştırabilirsiniz:
        </p>
        
        <p style="font-size: 11px; color: #999; word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px;">
            {verification_url}
        </p>
        
        <p style="font-size: 12px; color: #666; margin-top: 20px;">
            Eğer bu hesabı siz oluşturmadıysanız, bu emaili görmezden gelebilirsiniz.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 11px; color: #999; text-align: center;">
            Bu email KAMPÜS+ Platform tarafından gönderilmiştir.<br>
            Sorularınız için: <a href="mailto:{self.support_email}" style="color: #667eea;">{self.support_email}</a>
        </p>
    </div>
</body>
</html>
"""
    
    def _create_verification_email_text(self, verification_url: str, user_name: str) -> str:
        """Create plain text email template for email verification.
        
        Args:
            verification_url: Full URL with verification token
            user_name: User's first name
            
        Returns:
            Plain text email content
        """
        return f"""
KAMPÜS+ Platform - Email Doğrulama

Merhaba {user_name},

KAMPÜS+ platformuna kaydolduğunuz için teşekkür ederiz! Hesabınızı aktifleştirmek için aşağıdaki linke tıklayarak email adresinizi doğrulayın:

{verification_url}

Not: Bu link 24 saat içinde geçerlidir.

Eğer bu hesabı siz oluşturmadıysanız, bu emaili görmezden gelebilirsiniz.

---
Bu email KAMPÜS+ Platform tarafından gönderilmiştir.
Sorularınız için: {self.support_email}
"""
    
    def _create_password_reset_email_html(self, reset_url: str, user_name: str) -> str:
        """Create HTML email template for password reset.
        
        Args:
            reset_url: Full URL with password reset token
            user_name: User's first name
            
        Returns:
            HTML email content
        """
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - KAMPÜS+</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">KAMPÜS+ Platform</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #667eea; margin-top: 0;">Şifre Sıfırlama</h2>
        
        <p>Merhaba {user_name},</p>
        
        <p>Hesabınız için şifre sıfırlama talebi aldık. Yeni şifrenizi belirlemek için aşağıdaki butona tıklayın.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_url}" 
               style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Şifremi Sıfırla
            </a>
        </div>
        
        <p style="font-size: 12px; color: #666; margin-top: 30px;">
            <strong>Not:</strong> Bu link 1 saat içinde geçerlidir. Eğer buton çalışmıyorsa, aşağıdaki linki tarayıcınıza kopyalayıp yapıştırabilirsiniz:
        </p>
        
        <p style="font-size: 11px; color: #999; word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px;">
            {reset_url}
        </p>
        
        <p style="font-size: 12px; color: #666; margin-top: 20px;">
            Eğer bu talebi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz. Şifreniz değişmeyecektir.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 11px; color: #999; text-align: center;">
            Bu email KAMPÜS+ Platform tarafından gönderilmiştir.<br>
            Sorularınız için: <a href="mailto:{self.support_email}" style="color: #667eea;">{self.support_email}</a>
        </p>
    </div>
</body>
</html>
"""
    
    def _send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send email via SMTP.
        
        Automatically selects SMTP server based on recipient email domain.
        Falls back to default SMTP if no university-specific config found.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML email body
            text_content: Plain text email body (optional, fallback)
            
        Returns:
            True if email sent successfully, False otherwise
        """
        # Extract domain from email
        email_domain = to_email.split('@')[1].lower() if '@' in to_email else ''
        
        # Get SMTP config for this domain
        smtp_config = self._get_smtp_config_for_domain(email_domain)
        
        # Check if SMTP is configured
        if not smtp_config['host'] or not smtp_config['user'] or not smtp_config['password']:
            logger.warning(
                "SMTP not configured. Email not sent.",
                extra={"to_email": to_email, "subject": subject, "domain": email_domain}
            )
            return False
        
        try:
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            # Resend requires format: "Name <email@domain.com>" or just "email@domain.com"
            # Ensure proper encoding for non-ASCII characters in name
            from_email = smtp_config['from_email']
            from_name = self.from_name
            # Use emailutils to properly encode the name if it contains non-ASCII
            from email.utils import formataddr
            msg["From"] = formataddr((from_name, from_email))
            msg["To"] = to_email
            
            # Add text and HTML parts
            if text_content:
                text_part = MIMEText(text_content, "plain", "utf-8")
                msg.attach(text_part)
            
            html_part = MIMEText(html_content, "html", "utf-8")
            msg.attach(html_part)
            
            # Connect to SMTP server and send
            with smtplib.SMTP(smtp_config['host'], smtp_config['port']) as server:
                server.starttls()  # Enable TLS
                server.login(smtp_config['user'], smtp_config['password'])
                server.send_message(msg)
            
            logger.info(
                "Email sent successfully",
                extra={
                    "to_email": to_email,
                    "subject": subject,
                    "domain": email_domain,
                    "smtp_host": smtp_config['host'],
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            return True
            
        except smtplib.SMTPException as e:
            logger.error(
                "SMTP error while sending email",
                extra={
                    "to_email": to_email,
                    "subject": subject,
                    "domain": email_domain,
                    "smtp_host": smtp_config['host'],
                    "error": str(e)
                },
                exc_info=True
            )
            return False
        except Exception as e:
            logger.error(
                "Unexpected error while sending email",
                extra={
                    "to_email": to_email,
                    "subject": subject,
                    "domain": email_domain,
                    "error": str(e)
                },
                exc_info=True
            )
            return False
    
    # EMAIL VERIFICATION DISABLED - TODO: Re-enable in production
    # def send_verification_email(
    #     self,
    #     to_email: str,
    #     verification_token: str,
    #     user_name: str,
    #     frontend_url: Optional[str] = None
    # ) -> bool:
    #     """Send email verification email.
    #     
    #     Args:
    #         to_email: Recipient email address
    #         verification_token: JWT verification token
    #         user_name: User's first name
    #         frontend_url: Frontend base URL (default: from settings or http://localhost:5173)
    #         
    #     Returns:
    #         True if email sent successfully, False otherwise
    #     """
    #     # Build verification URL
    #     if not frontend_url:
    #         # Try to get from CORS origins (first one)
    #         cors_origins = self.settings.cors_origins_list
    #         frontend_url = cors_origins[0] if cors_origins else "http://localhost:5173"
    #     
    #     verification_url = f"{frontend_url}/verify-email?token={verification_token}"
    #     
    #     # Create email content
    #     html_content = self._create_verification_email_html(verification_url, user_name)
    #     text_content = self._create_verification_email_text(verification_url, user_name)
    #     
    #     # Send email
    #     return self._send_email(
    #         to_email=to_email,
    #         subject="KAMPÜS+ - Email Adresinizi Doğrulayın",
    #         html_content=html_content,
    #         text_content=text_content
    #     )
    
    def send_password_reset_email(
        self,
        to_email: str,
        reset_token: str,
        user_name: str,
        frontend_url: Optional[str] = None
    ) -> bool:
        """Send password reset email.
        
        Args:
            to_email: Recipient email address
            reset_token: JWT password reset token
            user_name: User's first name
            frontend_url: Frontend base URL (default: from settings or http://localhost:5173)
            
        Returns:
            True if email sent successfully, False otherwise
        """
        # Build reset URL
        if not frontend_url:
            cors_origins = self.settings.cors_origins_list
            frontend_url = cors_origins[0] if cors_origins else "http://localhost:5173"
        
        reset_url = f"{frontend_url}/reset-password?token={reset_token}"
        
        # Create email content
        html_content = self._create_password_reset_email_html(reset_url, user_name)
        
        # Send email
        return self._send_email(
            to_email=to_email,
            subject="KAMPÜS+ - Şifre Sıfırlama",
            html_content=html_content
        )


# Singleton instance
_email_service: Optional[EmailService] = None


def get_email_service() -> EmailService:
    """Get or create email service singleton instance.
    
    Returns:
        EmailService instance
    """
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service

