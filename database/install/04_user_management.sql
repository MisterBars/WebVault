-- Execute after 03_user_lifecycle.sql in SSMS as administrator.
USE [WebVault];
GO
IF COL_LENGTH(N'auth.Users',N'DeletedUtc') IS NULL
    THROW 50001, 'Run 03_user_lifecycle.sql first.', 1;
GO
-- Permanent deletion requires this object-level permission, not db_owner.
GRANT DELETE ON OBJECT::auth.Users TO [webvault_app];
GO
