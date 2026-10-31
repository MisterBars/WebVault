# Benchmark run journal foundation

This is an independent metadata primitive, not an HTTP endpoint and not yet integrated with BenchmarkFileCycle. It does not create accounts, execute file cycles, delete test payloads or automatically recover orphaned runs. Do not publish a new benchmark action based only on these helpers.

## Windows check

From the repository root, in a fresh Windows PowerShell process:

```powershell
powershell.exe -NoProfile -File .\tools\Test-BenchmarkRunJournal.ps1
if ($LASTEXITCODE -ne 0) { throw 'Run-journal checks failed; stop' }
```

Expected: PASS: 13/13 run-journal groups. This compiles only the new journal and its harness and uses a unique .wvj-* directory under the checkout, deleted in finally. No live DataRoot, IIS, SQL, npm or build is used. The assistant has not run the Windows check. The previous user-reported 12/12 file-cycle groups are not a journal-test result.

## Contract

The future host supplies an existing, server-resolved DataRoot/Bench/<runId> directory and binds its path to the expected run identity. The primitive checks existing ancestors/reparse points and directory length, but does not independently prove Bench ancestry or site exclusion. Never pass paths or identity fields directly from untrusted JSON. The host supplies authenticated owner, SessionId, grant generation, request ID and server run ID. There is no token, password or CSRF secret in the journal.

journal.bin is a bounded 122-byte versioned record: owner/session, three GUIDs, deadline, workload parameters, next step, phase and cleanup confirmation, followed by a SHA-256 checksum. The checksum detects corruption, not forgery or authentication; trusted filesystem ACLs remain essential. journal.lock is held exclusively during transitions across cooperating processes. Contention fails without retry. A new record is flushed to journal.new and moved/replaced into journal.bin. Leftover journal.new blocks reads and mutations as uncertain; it is never silently deleted or overwritten.

Initialize repeats return the existing matching record without resetting progress or extending its 120-second deadline. Conflicting identity/configuration fails. Discovery of a run from a lost start response and global capacity reservation are NOT provided by this class. The future host must durably map request identity to run path before any payload mutation.

Begin writes phase 1 (working) before payload mutation. A reopened working record must not replay the step. Complete advances next only from the matching working step after the host has verified the file operation. A repeated Complete fails instead of advancing twice; the caller must query status after a lost response and discard the uncertain timing. The journal stores no samples or successful HTTP timing.

Phases: 0 ready, 1 working/uncertain, 2 stopped. Begin/Complete require the stored grant generation, a mandatory live authorization callback, UTC clock supplied by trusted host code, and a nonexpired/nonstopped run. The clock is sampled after the second authorization callback to reject expiration during authorization. Callbacks in the harness are test doubles, not permission checks.

Read/Stop/ConfirmCleanup require same-owner/same-session authentication callbacks but not the original still-active benchmark grant, so revocation need not prevent safe cleanup. Ownership/run/request mismatches fail. Stop does not delete payload. ConfirmCleanup requires stopped state and a mandatory host callback that verifies the permitted payload is absent; journal metadata itself may remain. The host must implement that verification, not provide a no-op callback. Failed verification cannot set cleanup confirmation.

The test covers reopen, duplicate initialization/start/complete, ownership/session/request mismatches, generation/auth refusal, expiry during authorization, stop and cleanup verification, corruption, interrupted-write residue, exclusive locking, config conflict and exhausted steps. It does not kill IIS, prove power-loss durability, exercise malicious OS administrators/reparse races, authenticate SQL sessions or test a browser. Restart is modeled by separate disk reads with no in-memory run registry.

## Remaining integration

Connect the journal and file-cycle helper under one consistent run layout/locking discipline; add durable request lookup, per-owner/global quotas, bounded orphan cleanup, SQL/session/grant adapter, endpoint and transport/UI alignment. Existing BenchmarkFileCycle cleanup currently knows only its own marker and payload names; do not place journal files into its invocation directory without updating that contract and tests. Canonical benchmark/backlog/history updates accompany the connected feature, not a claim that it already works.
