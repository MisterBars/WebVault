-- Run in SSMS as an administrator. IIS and SQL Server must be on the same machine for the following AppPool script.
USE [master];
GO
IF DB_ID(N'WebVault') IS NULL
BEGIN
    EXEC(N'CREATE DATABASE [WebVault]');
END;
GO
ALTER DATABASE [WebVault] SET AUTO_CLOSE OFF;
ALTER DATABASE [WebVault] SET AUTO_SHRINK OFF;
GO
USE [WebVault];
GO
IF SCHEMA_ID(N'auth') IS NULL EXEC(N'CREATE SCHEMA [auth] AUTHORIZATION [dbo]');
IF SCHEMA_ID(N'notes') IS NULL EXEC(N'CREATE SCHEMA [notes] AUTHORIZATION [dbo]');
IF SCHEMA_ID(N'settings') IS NULL EXEC(N'CREATE SCHEMA [settings] AUTHORIZATION [dbo]');
GO
-- Recovery model is intentionally not changed on an existing database.
-- Tables will be introduced by subsequent scripts.
