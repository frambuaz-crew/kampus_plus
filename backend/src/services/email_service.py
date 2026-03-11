"""Email servisi - Doğrulama ve bildirim email'leri gönderme.

Spec: specs/002-register-page, specs/003-login-page
"""

import smtplib
from urllib.parse import quote
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from typing import Optional

import logging

from src.core.config import get_settings

logger = logging.getLogger(__name__)


class EmailService:
    """SMTP ile email gönderme servisi."""
    
    def __init__(self):
        """Email servisini başlat."""
        self.settings = get_settings()
        self.smtp_host = self.settings.smtp_host
        self.smtp_port = self.settings.smtp_port
        self.smtp_user = self.settings.smtp_user
        self.smtp_password = self.settings.smtp_password
        self.from_email = self.settings.smtp_from_email
        self.from_name = self.settings.smtp_from_name
        self.support_email = self.settings.support_email
    
    def _create_verification_email_html(self, verification_url: str, user_name: str) -> str:
        """Email doğrulama için HTML email şablonu oluştur."""
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
        """Email doğrulama için düz metin email şablonu oluştur."""
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
        """Şifre sıfırlama için HTML email şablonu oluştur."""
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
        """SMTP ile email gönder."""
        # Host yoksa gönderimi durdur (MailHog için Host yeterlidir, User/Pass şart değil)
        if not self.smtp_host:
            logger.warning(f"SMTP Host yapılandırılmamış. Email gönderilmedi: {to_email}")
            return False
        
        try:
            # Mail objesini oluştur
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = formataddr((self.from_name, self.from_email))
            msg["To"] = to_email
            
            # ÖNCE düz metin (plain text) kısmını ekle (Daha az öncelikli)
            if text_content:
                msg.attach(MIMEText(text_content, "plain", "utf-8"))
            else:
                # Düz metin yoksa HTML'den bir kopya üretilebilir veya boş bırakılabilir
                msg.attach(MIMEText("Lütfen bu maili görüntülemek için HTML destekli bir istemci kullanın.", "plain", "utf-8"))
            
            # SONRA HTML kısmını ekle (Daha çok öncelikli - Mail istemcileri bunu gösterir)
            msg.attach(MIMEText(html_content, "html", "utf-8"))
            
            # SMTP Sunucusuna bağlan
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                # Sadece kullanıcı adı ve şifre varsa (Production ortamı) TLS ve Login yap
                if self.smtp_user and self.smtp_password:
                    server.starttls() # Güvenli bağlantıyı başlat
                    server.login(self.smtp_user, self.smtp_password)
                
                # Maili gönder
                server.send_message(msg)
            
            logger.info(f"Email başarıyla gönderildi: {to_email} - {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Email gönderme hatası: {to_email} - {subject} - {e}", exc_info=True)
            return False
    
    def send_verification_email(
        self,
        to_email: str,
        verification_token: str,
        user_name: str,
        frontend_url: Optional[str] = None
    ) -> bool:
        """Email doğrulama email'i gönder.
        
        Args:
            to_email: Alıcı email adresi
            verification_token: JWT doğrulama token'ı
            user_name: Kullanıcının adı
            frontend_url: Frontend base URL (opsiyonel)
        
        Returns:
            Email başarıyla gönderildiyse True
        """
        base_frontend_url = (frontend_url or self.settings.frontend_url).rstrip("/")
        verification_url = f"{base_frontend_url}/verify-email?token={quote(verification_token)}"
        
        html_content = self._create_verification_email_html(verification_url, user_name)
        text_content = self._create_verification_email_text(verification_url, user_name)
        
        return self._send_email(
            to_email=to_email,
            subject="KAMPÜS+ - Email Adresinizi Doğrulayın",
            html_content=html_content,
            text_content=text_content
        )
    
    def send_password_reset_email(
        self,
        to_email: str,
        reset_token: str,
        user_name: str,
        frontend_url: Optional[str] = None
    ) -> bool:
        """Şifre sıfırlama email'i gönder.
        
        Args:
            to_email: Alıcı email adresi
            reset_token: JWT şifre sıfırlama token'ı
            user_name: Kullanıcının adı
            frontend_url: Frontend base URL (opsiyonel)
        
        Returns:
            Email başarıyla gönderildiyse True
        """
        base_frontend_url = (frontend_url or self.settings.frontend_url).rstrip("/")
        reset_url = f"{base_frontend_url}/reset-password?token={quote(reset_token)}"
        
        html_content = self._create_password_reset_email_html(reset_url, user_name)
        
        return self._send_email(
            to_email=to_email,
            subject="KAMPÜS+ - Şifre Sıfırlama",
            html_content=html_content
        )


_email_service: Optional[EmailService] = None


def get_email_service() -> EmailService:
    """Email servisi singleton instance'ı al veya oluştur."""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
