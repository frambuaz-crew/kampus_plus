"""S3 storage service for user-uploaded documents.

This module provides AWS S3 integration for:
- Uploading user PDF documents
- Generating pre-signed URLs for secure downloads
- Deleting documents
- Managing bucket structure with user-specific prefixes
"""

from datetime import datetime, timedelta
from pathlib import Path
from typing import BinaryIO, Optional
from uuid import UUID

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError, NoCredentialsError

from src.core.config import get_settings


class S3Service:
    """Manages S3 bucket operations for document storage."""
    
    def __init__(self):
        """Initialize S3 service with AWS credentials."""
        settings = get_settings()
        
        # Create boto3 S3 client with optional endpoint URL (for MinIO/LocalStack)
        client_kwargs = {
            "service_name": "s3",
            "aws_access_key_id": settings.aws_access_key_id,
            "aws_secret_access_key": settings.aws_secret_access_key,
            "region_name": settings.aws_region,
            "config": Config(signature_version="s3v4"),
        }
        
        if settings.aws_s3_endpoint_url:
            client_kwargs["endpoint_url"] = settings.aws_s3_endpoint_url
        
        self.s3_client = boto3.client(**client_kwargs)
        
        self.bucket_name = settings.aws_s3_bucket
        self.presigned_url_expiry = settings.s3_presigned_url_expiry_seconds
        self.endpoint_url = settings.aws_s3_endpoint_url
        
        print(f"✅ S3 client initialized: bucket={self.bucket_name}, region={settings.aws_region}, endpoint={self.endpoint_url or 'AWS'}")
        
        # Auto-create bucket if using MinIO/LocalStack
        if self.endpoint_url:
            self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist (for MinIO/LocalStack)."""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            print(f"✅ Bucket '{self.bucket_name}' exists")
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            if error_code == "404":
                try:
                    self.s3_client.create_bucket(Bucket=self.bucket_name)
                    print(f"✅ Created bucket '{self.bucket_name}'")
                except ClientError as create_error:
                    print(f"❌ Failed to create bucket: {create_error}")
            else:
                print(f"❌ Error checking bucket: {e}")
    
    def _generate_s3_key(self, user_id: UUID, document_id: UUID, filename: str) -> str:
        """Generate S3 object key with user-specific prefix.
        
        Format: uploads/{user_id}/{document_id}/{original_filename}
        
        Args:
            user_id: User's UUID.
            document_id: Document's UUID.
            filename: Original filename.
        
        Returns:
            S3 object key string.
        """
        # Sanitize filename (remove special characters)
        safe_filename = Path(filename).name
        
        return f"uploads/{user_id}/{document_id}/{safe_filename}"
    
    async def upload_file(
        self,
        file: BinaryIO,
        user_id: UUID,
        document_id: UUID,
        filename: str,
        content_type: str = "application/pdf",
    ) -> str:
        """Upload file to S3 bucket.
        
        Args:
            file: File-like object to upload.
            user_id: Owner's user ID.
            document_id: Document ID.
            filename: Original filename.
            content_type: MIME type (default: application/pdf).
        
        Returns:
            S3 object key.
        
        Raises:
            ClientError: If upload fails.
            NoCredentialsError: If AWS credentials are invalid.
        """
        s3_key = self._generate_s3_key(user_id, document_id, filename)
        
        try:
            # Upload file with metadata (exclude filename to avoid non-ASCII issues)
            self.s3_client.upload_fileobj(
                file,
                self.bucket_name,
                s3_key,
                ExtraArgs={
                    "ContentType": content_type,
                    "Metadata": {
                        "user_id": str(user_id),
                        "document_id": str(document_id),
                        "uploaded_at": datetime.utcnow().isoformat(),
                    },
                },
            )
            
            print(f"✅ Uploaded to S3: {s3_key}")
            return s3_key
            
        except NoCredentialsError:
            print("❌ AWS credentials not found or invalid")
            raise
        except ClientError as e:
            print(f"❌ S3 upload failed: {e}")
            raise
    
    def generate_presigned_download_url(
        self,
        s3_key: str,
        expiry_seconds: Optional[int] = None,
    ) -> str:
        """Generate pre-signed URL for secure file download.
        
        Args:
            s3_key: S3 object key.
            expiry_seconds: URL expiration time (default: 900s = 15 minutes).
        
        Returns:
            Pre-signed URL string.
        
        Raises:
            ClientError: If URL generation fails.
        """
        if expiry_seconds is None:
            expiry_seconds = self.presigned_url_expiry
        
        try:
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self.bucket_name,
                    "Key": s3_key,
                },
                ExpiresIn=expiry_seconds,
            )
            
            print(f"✅ Generated presigned URL: {s3_key} (expires in {expiry_seconds}s)")
            return url
            
        except ClientError as e:
            print(f"❌ Presigned URL generation failed: {e}")
            raise
    
    def generate_presigned_upload_url(
        self,
        s3_key: str,
        content_type: str = "application/pdf",
        expiry_seconds: Optional[int] = None,
    ) -> dict:
        """Generate pre-signed POST URL for direct client uploads.
        
        Useful for frontend direct uploads without backend proxy.
        
        Args:
            s3_key: S3 object key.
            content_type: Expected MIME type.
            expiry_seconds: URL expiration time (default: 900s).
        
        Returns:
            Dictionary with 'url' and 'fields' for POST request.
        
        Raises:
            ClientError: If URL generation fails.
        """
        if expiry_seconds is None:
            expiry_seconds = self.presigned_url_expiry
        
        try:
            response = self.s3_client.generate_presigned_post(
                self.bucket_name,
                s3_key,
                Fields={"Content-Type": content_type},
                Conditions=[
                    {"Content-Type": content_type},
                    ["content-length-range", 1, 26214400],  # 1 byte to 25 MB
                ],
                ExpiresIn=expiry_seconds,
            )
            
            print(f"✅ Generated presigned POST URL: {s3_key}")
            return response
            
        except ClientError as e:
            print(f"❌ Presigned POST URL generation failed: {e}")
            raise
    
    async def delete_file(self, s3_key: str) -> bool:
        """Delete file from S3 bucket.
        
        Args:
            s3_key: S3 object key to delete.
        
        Returns:
            True if deletion succeeded, False otherwise.
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key,
            )
            
            print(f"✅ Deleted from S3: {s3_key}")
            return True
            
        except ClientError as e:
            print(f"❌ S3 deletion failed: {e}")
            return False
    
    def check_file_exists(self, s3_key: str) -> bool:
        """Check if file exists in S3 bucket.
        
        Args:
            s3_key: S3 object key to check.
        
        Returns:
            True if file exists, False otherwise.
        """
        try:
            self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key,
            )
            return True
        except ClientError:
            return False
    
    def get_file_metadata(self, s3_key: str) -> Optional[dict]:
        """Get file metadata from S3.
        
        Args:
            s3_key: S3 object key.
        
        Returns:
            Dictionary with metadata or None if file not found.
        """
        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key,
            )
            
            return {
                "content_type": response.get("ContentType"),
                "content_length": response.get("ContentLength"),
                "last_modified": response.get("LastModified"),
                "metadata": response.get("Metadata", {}),
                "etag": response.get("ETag"),
            }
        except ClientError as e:
            print(f"❌ Failed to get metadata: {e}")
            return None
    
    async def download_file(self, s3_key: str) -> Optional[bytes]:
        """Download file content from S3.
        
        Args:
            s3_key: S3 object key.
        
        Returns:
            File content as bytes or None if download fails.
        """
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=s3_key,
            )
            
            content = response["Body"].read()
            print(f"✅ Downloaded from S3: {s3_key} ({len(content)} bytes)")
            return content
            
        except ClientError as e:
            print(f"❌ S3 download failed: {e}")
            return None
    
    def list_user_files(self, user_id: UUID, max_keys: int = 1000) -> list[dict]:
        """List all files for a specific user.
        
        Args:
            user_id: User's UUID.
            max_keys: Maximum number of files to return.
        
        Returns:
            List of dictionaries with file information.
        """
        prefix = f"uploads/{user_id}/"
        
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix,
                MaxKeys=max_keys,
            )
            
            files = []
            for obj in response.get("Contents", []):
                files.append({
                    "key": obj["Key"],
                    "size": obj["Size"],
                    "last_modified": obj["LastModified"],
                    "etag": obj["ETag"],
                })
            
            print(f"✅ Listed {len(files)} files for user {user_id}")
            return files
            
        except ClientError as e:
            print(f"❌ S3 list failed: {e}")
            return []
    
    def get_bucket_info(self) -> dict:
        """Get S3 bucket information and statistics.
        
        Returns:
            Dictionary with bucket info.
        """
        try:
            # Get bucket location
            location = self.s3_client.get_bucket_location(Bucket=self.bucket_name)
            
            return {
                "bucket_name": self.bucket_name,
                "region": location.get("LocationConstraint", "us-east-1"),
                "presigned_url_expiry": self.presigned_url_expiry,
                "status": "connected",
            }
        except ClientError as e:
            return {
                "bucket_name": self.bucket_name,
                "status": "error",
                "error": str(e),
            }


# Global service instance
_s3_service: S3Service | None = None


def get_s3_service() -> S3Service:
    """Get or create the global S3 service instance.
    
    Returns:
        S3Service: Singleton instance.
    """
    global _s3_service
    
    if _s3_service is None:
        _s3_service = S3Service()
    
    return _s3_service
