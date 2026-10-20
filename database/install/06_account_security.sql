-- Run as administrator after 00-05. Back up WebVault first.
USE [WebVault];
GO
IF OBJECT_ID(N'auth.Users',N'U') IS NULL THROW 50001, 'Run 02_auth.sql first.', 1;
GO
IF COL_LENGTH(N'auth.Users',N'MustChangePassword') IS NULL
    ALTER TABLE auth.Users ADD MustChangePassword bit NOT NULL CONSTRAINT DF_auth_Users_MustChangePassword DEFAULT(0) WITH VALUES;
GO
IF OBJECT_ID(N'auth.PasswordResetEvents',N'U') IS NULL
BEGIN
    CREATE TABLE auth.PasswordResetEvents
    (
        EventId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_auth_PasswordResetEvents PRIMARY KEY,
        ActorUserId int NOT NULL,
        TargetUserId int NOT NULL,
        CreatedUtc datetime2(3) NOT NULL CONSTRAINT DF_auth_PasswordResetEvents_CreatedUtc DEFAULT(SYSUTCDATETIME())
    );
END;
GO
GRANT INSERT ON OBJECT::auth.PasswordResetEvents TO webvault_app;
GO
-- Events intentionally have no FK: account deletion must not erase/block the reset record.
-- No passwords or tokens in this table. Existing accounts keep MustChangePassword=0.
