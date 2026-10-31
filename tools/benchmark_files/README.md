# Isolated benchmark file-cycle foundation

Status: preparation code, not connected to HTTP or the benchmark screen. No SQL migration, configuration change, bundle build or site publication is required for the standalone test. This is not a completed PERF-ADMIN-01 package.

## Run on Windows

From the repository root, use a fresh Windows PowerShell process with .NET Framework 4.5 or newer:

```powershell
powershell.exe -NoProfile -File .\tools\Test-BenchmarkFileCycle.ps1
if ($LASTEXITCODE -ne 0) { throw 'File-cycle checks failed; stop' }
```

Do not weaken execution policy blindly if the script is blocked. The script compiles the helper and test harness together and exercises twelve groups in a unique short .wvb-* directory under the repository root, removed in finally. It never reads a configured/live DataRoot and verifies sentinel files in mock vaults/history. Expected output: PASS: 12/12 file-cycle groups. A compiler or filesystem error is a failed check, not a reason to continue publication.

The test preflights the longest ordinary case path against the helper's unchanged 100-character root limit. An additional boundary group requires a 100-character root to work and a 101-character root to fail without creating Bench. Long OS temporary paths are no longer used for the fixtures. If the checkout itself is too long, the script stops before creating test data and requests a shorter checkout. If a process is killed, its uniquely named test directory may remain; do not include it in a commit.

The assistant has not executed this PowerShell/.NET test. Node tests and Python inspection cannot establish its result. Windows junction/reparse races, process termination, real IIS sessions and target deployment remain untested.

## Foundation contract

BenchmarkFileCycle.Execute receives an existing validated DataRoot, actors (1..8), sizeKiB (1..64), and a mandatory live authorization callback. It creates DataRoot/Bench only after the initial callback succeeds. The future HTTP host must validate DataRoot is outside the website and must implement owner/session/grant checks in the callback. A no-op callback is used ONLY by the temporary test harness, never by a production route.

Layout: Bench/<server-generated-runId>/owner.txt and vaults/actor-0001/note.md, with update.tmp during replacement. Actors are folders, not auth.Users or independent authenticated sessions. No private vault ID is registered. The root uses a fixed format marker and an exclusive root.lock; existing unmarked Bench data is not adopted. Unknown root entries block a new cycle. Up to 32 run directories, including residues, are permitted. Each invocation is synchronous and globally serialized under the file lock, not a concurrent-user load test. Contention fails without sleeping/retrying mutations.

A cycle creates deterministic ASCII bytes, reads and compares all bytes, verifies the previous content again before replacement, flushes a new temporary file, replaces the note without retaining a history backup, verifies the new bytes and deletes the note. The result reports three verified reads per actor. CycleMs includes synthetic fixture generation, actor directory creation, file IO, validation and intermediate authorization callbacks; it excludes final run-directory cleanup and is not physical disk latency or the personal note-save pipeline.

The 120-second budget is checked cooperatively. It cannot forcibly interrupt synchronous IO or the authorization callback. Any failed callback, operation, verification or cleanup prevents a successful result. Cleanup acts only on the newly created invocation's known paths after verifying its marker, never recursively deletes a run, and refuses unknown entries/reparse points. Successful cleanup leaves only the managed root marker and root.lock.

If the process dies or marker/cleanup fails, residual directories remain and count against capacity. There is NO automatic orphan recovery, durable owner/session manifest, cross-request status, request deduplication or janitor in this foundation. Do not expose it as an HTTP endpoint until those protections and their tests are implemented. The root lock serializes cooperating processes, not a malicious OS administrator; filesystem ACLs remain required.

## Package boundary

This package provides the file-cycle helper, its standalone Windows compilation/IO test and this contract. Remaining work: durable request/run protocol, real permission adapter, bounds/recovery tests, existing transport alignment (its earlier fixture contract must be reconciled), endpoint, UI, target regression and canonical documentation/backlog/history updates for the connected feature. No existing handlers, SQL, working config or personal data are modified by this Git package.
