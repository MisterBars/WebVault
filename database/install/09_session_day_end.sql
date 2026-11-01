-- WebVault: explicit remembered-session mode. SQL Server 2014 compatible.
-- Run manually after 00-08, with a database backup and no active deployment.
-- Does not extend, revoke or recreate any existing session.
USE [WebVault];
GO
SET XACT_ABORT ON;
SET NOCOUNT ON;
BEGIN TRY
    BEGIN TRANSACTION;
    IF OBJECT_ID(N'auth.UserSessions',N'U') IS NULL
        THROW 50001, 'Run the authentication schema first.', 1;
    IF COL_LENGTH(N'auth.Users',N'MustChangePassword') IS NULL
        THROW 50002, 'Run the account-security migration first.', 1;
    IF COL_LENGTH(N'auth.Users',N'BenchmarkGrant') IS NULL
        THROW 50003, 'Run migration 08 first.', 1;

    IF COL_LENGTH(N'auth.UserSessions',N'RememberUntilDayEnd') IS NULL
        EXEC(N'ALTER TABLE auth.UserSessions ADD RememberUntilDayEnd bit NOT NULL CONSTRAINT DF_auth_UserSessions_RememberUntilDayEnd DEFAULT (0) WITH VALUES;');

    IF NOT EXISTS
    (
        SELECT 1 FROM sys.columns c
        JOIN sys.default_constraints d ON d.object_id=c.default_object_id
        WHERE c.object_id=OBJECT_ID(N'auth.UserSessions',N'U')
          AND c.name=N'RememberUntilDayEnd' AND c.system_type_id=104 AND c.is_nullable=0
          AND REPLACE(REPLACE(REPLACE(d.definition,N'(',N''),N')',N''),N' ',N'')=N'0'
    )
        THROW 50004, 'Unexpected RememberUntilDayEnd column or default; stop and inspect.', 1;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
-- Existing table-level application permissions cover the added column.
SELECT c.name,c.is_nullable,d.definition AS DefaultDefinition
FROM sys.columns c JOIN sys.default_constraints d ON d.object_id=c.default_object_id
WHERE c.object_id=OBJECT_ID(N'auth.UserSessions',N'U') AND c.name=N'RememberUntilDayEnd';
GO
