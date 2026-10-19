-- Run as administrator after 02_auth.sql, before using the updated users API.
USE [WebVault];
GO
IF OBJECT_ID(N'auth.Users',N'U') IS NULL
    THROW 50001, 'Run 02_auth.sql first.', 1;
GO
IF COL_LENGTH(N'auth.Users',N'DeletedUtc') IS NULL
    ALTER TABLE auth.Users ADD DeletedUtc datetime2(3) NULL;
GO
-- Existing object-level SELECT/INSERT/UPDATE permissions remain sufficient.
-- Soft deletion never removes files and never reuses a login.
