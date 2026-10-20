-- Run as administrator after 00-06. Back up DB and DataRoot before testing.
USE [WebVault];
GO
IF OBJECT_ID(N'storage.UserVaults',N'U') IS NULL THROW 50001, 'Run 05_user_vaults.sql first.', 1;
GO
IF OBJECT_ID(N'storage.PurgeJobs',N'U') IS NULL
CREATE TABLE storage.PurgeJobs(
 JobId uniqueidentifier NOT NULL CONSTRAINT PK_storage_PurgeJobs PRIMARY KEY,
 TargetUserId int NOT NULL CONSTRAINT UQ_storage_PurgeJobs_Target UNIQUE,
 ActorUserId int NOT NULL,VaultId uniqueidentifier NULL,RootHash binary(32) NULL,
 Status varchar(20) NOT NULL,LastError varchar(80) NULL,
 CreatedUtc datetime2(3) NOT NULL DEFAULT(SYSUTCDATETIME()),UpdatedUtc datetime2(3) NOT NULL DEFAULT(SYSUTCDATETIME()),
 CONSTRAINT CK_storage_PurgeJobs_Status CHECK(Status IN('Started','RetryRequired','Complete'))
);
GO
GRANT SELECT,INSERT,UPDATE ON OBJECT::storage.PurgeJobs TO webvault_app;
GRANT DELETE ON OBJECT::storage.UserVaults TO webvault_app;
GO
IF OBJECT_ID(N'storage.AssertPurgeSchema',N'P') IS NULL EXEC(N'CREATE PROCEDURE storage.AssertPurgeSchema AS RETURN;');
GO
ALTER PROCEDURE storage.AssertPurgeSchema WITH EXECUTE AS OWNER AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE
  (referenced_object_id=OBJECT_ID(N'auth.Users') AND parent_object_id NOT IN(OBJECT_ID(N'auth.UserSessions'),OBJECT_ID(N'storage.UserVaults')))
  OR referenced_object_id IN(OBJECT_ID(N'auth.UserSessions'),OBJECT_ID(N'storage.UserVaults')))
  THROW 50007, 'Purge implementation does not support the current dependent schema.', 1;
END;
GO
GRANT EXECUTE ON OBJECT::storage.AssertPurgeSchema TO webvault_app;
GO
-- Jobs retain IDs only, no FK/password/note content. Script itself deletes no users/files.
