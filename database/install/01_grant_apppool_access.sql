-- Create WebVaultPool in IIS first, using ApplicationPoolIdentity.
-- Run in SSMS with permissions to create logins and database users.
-- This script assumes IIS and SQL Server are on the same Windows machine.
USE [master];
GO
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'IIS APPPOOL\WebVaultPool')
    CREATE LOGIN [IIS APPPOOL\WebVaultPool] FROM WINDOWS;
GO
USE [WebVault];
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'IIS APPPOOL\WebVaultPool')
    CREATE USER [IIS APPPOOL\WebVaultPool] FOR LOGIN [IIS APPPOOL\WebVaultPool];
GO
IF DATABASE_PRINCIPAL_ID(N'webvault_app') IS NULL
    CREATE ROLE [webvault_app] AUTHORIZATION [dbo];
GO
GRANT CONNECT TO [webvault_app];
IF NOT EXISTS (
    SELECT 1 FROM sys.database_role_members
    WHERE role_principal_id = DATABASE_PRINCIPAL_ID(N'webvault_app')
      AND member_principal_id = DATABASE_PRINCIPAL_ID(N'IIS APPPOOL\WebVaultPool')
)
    ALTER ROLE [webvault_app] ADD MEMBER [IIS APPPOOL\WebVaultPool];
GO
-- No db_owner, DDL, or table permissions are granted.
-- Future feature scripts will grant only the required object permissions.
