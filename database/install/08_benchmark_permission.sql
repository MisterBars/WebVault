-- Product permission, not a benchmark-time schema change. Run manually after 00-07.
-- Back up WebVault first. Existing users remain denied. No sessions are changed.
USE [WebVault];
GO
SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION;
    IF OBJECT_ID(N'auth.Users',N'U') IS NULL THROW 50001, 'Run 02_auth.sql first.', 1;
    IF COL_LENGTH(N'auth.Users',N'BenchmarkGrant') IS NULL
        ALTER TABLE auth.Users ADD BenchmarkGrant uniqueidentifier NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N'auth.Users') AND name=N'BenchmarkGrant' AND user_type_id=TYPE_ID(N'uniqueidentifier') AND is_nullable=1)
        THROW 50002, 'Unexpected BenchmarkGrant definition. Stop and inspect schema.', 1;
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
-- Existing SELECT/UPDATE object grants cover this column; no broad privilege grant.
