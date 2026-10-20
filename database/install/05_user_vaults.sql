-- Execute in SSMS as administrator after scripts 00-04.
USE [WebVault];
GO
IF COL_LENGTH(N'auth.Users',N'DeletedUtc') IS NULL
    THROW 50001, 'Run 03_user_lifecycle.sql first.', 1;
GO
IF SCHEMA_ID(N'storage') IS NULL EXEC(N'CREATE SCHEMA [storage] AUTHORIZATION [dbo]');
GO
IF OBJECT_ID(N'storage.UserVaults',N'U') IS NULL
BEGIN
    CREATE TABLE storage.UserVaults
    (
        VaultId uniqueidentifier NOT NULL CONSTRAINT PK_storage_UserVaults PRIMARY KEY,
        UserId int NOT NULL CONSTRAINT UQ_storage_UserVaults_UserId UNIQUE,
        CreatedUtc datetime2(3) NOT NULL CONSTRAINT DF_storage_UserVaults_CreatedUtc DEFAULT(SYSUTCDATETIME()),
        CONSTRAINT FK_storage_UserVaults_Users FOREIGN KEY(UserId) REFERENCES auth.Users(UserId)
    );
END;
GO
GRANT SELECT,INSERT,UPDATE ON OBJECT::storage.UserVaults TO webvault_app;
GO
-- No DELETE or cascading removal: permanent account deletion with a vault must fail safely.
