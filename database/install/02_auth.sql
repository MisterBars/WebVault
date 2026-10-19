-- WebVault authentication schema v1. SQL Server 2014 compatible.
-- Run after 00_database.sql and 01_grant_apppool_access.sql in SSMS as administrator.
-- No accounts, credentials or sessions are created by this script.
USE [WebVault];
GO
SET XACT_ABORT ON;
SET NOCOUNT ON;
BEGIN TRY
    BEGIN TRANSACTION;
    IF SCHEMA_ID(N'auth') IS NULL
        THROW 50001, 'Run 00_database.sql first.', 1;
    IF DATABASE_PRINCIPAL_ID(N'webvault_app') IS NULL
        THROW 50002, 'Run 01_grant_apppool_access.sql first.', 1;

    IF OBJECT_ID(N'auth.Users', N'U') IS NULL
    BEGIN
        CREATE TABLE auth.Users
        (
            UserId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_auth_Users PRIMARY KEY,
            Login nvarchar(64) NOT NULL,
            NormalizedLogin nvarchar(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
            DisplayName nvarchar(100) NOT NULL,
            PasswordHash varbinary(128) NOT NULL,
            PasswordSalt varbinary(64) NOT NULL,
            PasswordAlgorithm varchar(40) NOT NULL,
            PasswordIterations int NOT NULL,
            PasswordVersion smallint NOT NULL CONSTRAINT DF_auth_Users_PasswordVersion DEFAULT (1),
            IsAdmin bit NOT NULL CONSTRAINT DF_auth_Users_IsAdmin DEFAULT (0),
            IsActive bit NOT NULL CONSTRAINT DF_auth_Users_IsActive DEFAULT (1),
            FailedLoginCount int NOT NULL CONSTRAINT DF_auth_Users_FailedLoginCount DEFAULT (0),
            LockoutUntilUtc datetime2(3) NULL,
            CreatedUtc datetime2(3) NOT NULL CONSTRAINT DF_auth_Users_CreatedUtc DEFAULT (SYSUTCDATETIME()),
            UpdatedUtc datetime2(3) NOT NULL CONSTRAINT DF_auth_Users_UpdatedUtc DEFAULT (SYSUTCDATETIME()),
            PasswordChangedUtc datetime2(3) NOT NULL CONSTRAINT DF_auth_Users_PasswordChangedUtc DEFAULT (SYSUTCDATETIME()),
            LastLoginUtc datetime2(3) NULL,
            RowVersion rowversion NOT NULL,
            CONSTRAINT UQ_auth_Users_NormalizedLogin UNIQUE (NormalizedLogin),
            CONSTRAINT CK_auth_Users_Login CHECK (LEN(LTRIM(RTRIM(Login))) > 0 AND LEN(NormalizedLogin) > 0),
            CONSTRAINT CK_auth_Users_DisplayName CHECK (LEN(LTRIM(RTRIM(DisplayName))) > 0),
            CONSTRAINT CK_auth_Users_Password CHECK (DATALENGTH(PasswordHash) >= 32 AND DATALENGTH(PasswordSalt) >= 16 AND PasswordIterations > 0 AND PasswordVersion > 0 AND LEN(PasswordAlgorithm) > 0),
            CONSTRAINT CK_auth_Users_FailedLoginCount CHECK (FailedLoginCount >= 0)
        );
    END;

    IF OBJECT_ID(N'auth.UserSessions', N'U') IS NULL
    BEGIN
        CREATE TABLE auth.UserSessions
        (
            SessionId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_auth_UserSessions PRIMARY KEY,
            UserId int NOT NULL,
            TokenHash binary(32) NOT NULL,
            CsrfTokenHash binary(32) NOT NULL,
            CreatedUtc datetime2(3) NOT NULL CONSTRAINT DF_auth_UserSessions_CreatedUtc DEFAULT (SYSUTCDATETIME()),
            LastSeenUtc datetime2(3) NOT NULL CONSTRAINT DF_auth_UserSessions_LastSeenUtc DEFAULT (SYSUTCDATETIME()),
            ExpiresUtc datetime2(3) NOT NULL,
            AbsoluteExpiresUtc datetime2(3) NOT NULL,
            RevokedUtc datetime2(3) NULL,
            CONSTRAINT FK_auth_UserSessions_Users FOREIGN KEY (UserId) REFERENCES auth.Users(UserId),
            CONSTRAINT UQ_auth_UserSessions_TokenHash UNIQUE (TokenHash),
            CONSTRAINT CK_auth_UserSessions_Expiry CHECK (ExpiresUtc > CreatedUtc AND AbsoluteExpiresUtc >= ExpiresUtc AND LastSeenUtc >= CreatedUtc)
        );
        CREATE INDEX IX_auth_UserSessions_UserId ON auth.UserSessions(UserId);
        CREATE INDEX IX_auth_UserSessions_ExpiresUtc ON auth.UserSessions(ExpiresUtc);
    END;

    GRANT SELECT, INSERT, UPDATE ON OBJECT::auth.Users TO webvault_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON OBJECT::auth.UserSessions TO webvault_app;
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
-- Existing tables are not migrated or dropped. A changed schema requires a separate migration.
SELECT name AS AuthTable FROM sys.tables WHERE schema_id = SCHEMA_ID(N'auth') ORDER BY name;
GO
