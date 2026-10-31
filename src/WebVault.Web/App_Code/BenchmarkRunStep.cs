using System;
using System.IO;
using System.Text.RegularExpressions;

namespace WebVault
{
    // Согласование журнала и файлового исполнителя; HTTP пока не подключён.
    public static class BenchmarkRunStep
    {
        static void Fail(string code) { throw new InvalidOperationException(code); }
        static void Call(Action action)
        {
            if (action == null) throw new ArgumentNullException("action");
            action();
        }
        static FileStream Lease(string directory)
        {
            if (String.IsNullOrEmpty(directory) || !Regex.IsMatch(directory, @"\A[A-Za-z]:[\\/]")) Fail("benchmark_directory_invalid");
            string full = Path.GetFullPath(directory);
            if (full.Length > 190) Fail("benchmark_directory_invalid");
            DirectoryInfo d = new DirectoryInfo(full);
            if (!d.Exists) Fail("benchmark_directory_missing");
            while (d != null)
            {
                if ((d.Attributes & FileAttributes.ReparsePoint) != 0) Fail("benchmark_reparse_rejected");
                d = d.Parent;
            }
            string path = Path.Combine(full, "operation.lock");
            if (Directory.Exists(path)) Fail("benchmark_lock_invalid");
            if (File.Exists(path) && (File.GetAttributes(path) & FileAttributes.ReparsePoint) != 0) Fail("benchmark_reparse_rejected");
            return new FileStream(path, FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None);
        }
        static void Guard(string directory, BenchmarkRunJournal.Identity id, int index, Func<DateTime> clock, Action authorize)
        {
            Call(authorize);
            BenchmarkRunJournal.Snapshot s = BenchmarkRunJournal.Read(directory, id, authorize);
            DateTime now = clock();
            if (now.Kind != DateTimeKind.Utc) throw new ArgumentException("benchmark_clock_invalid");
            if (now.Ticks >= s.ExpiresUtcTicks || s.Phase != 1 || s.Next != index) Fail("benchmark_run_closed");
        }
        /// <summary>
        /// Исполнитель и callback полномочий задаются доверенным серверным кодом.
        /// Каталог уже должен принадлежать этому запуску внутри DataRoot/Bench.
        /// Ошибка до Complete оставляет выполняемый шаг; после Complete ответ может быть неопределённым.
        /// </summary>
        public static BenchmarkFileCycle.Result Execute(string directory, BenchmarkRunJournal.Identity id, int index,
            Func<DateTime> clock, Action authorize,
            Func<BenchmarkRunJournal.Snapshot, Action, BenchmarkFileCycle.Result> workload)
        {
            if (id == null) throw new ArgumentNullException("id");
            if (clock == null) throw new ArgumentNullException("clock");
            if (workload == null) throw new ArgumentNullException("workload");
            Call(authorize);
            using (FileStream gate = Lease(directory))
            {
                BenchmarkRunJournal.Snapshot s = BenchmarkRunJournal.Begin(directory, id, index, clock, authorize);
                Action check = delegate { Guard(directory, id, index, clock, authorize); };
                check();
                BenchmarkFileCycle.Result result = workload(s, check);
                check();
                if (result == null || !result.CleanupConfirmed || result.Actors != s.Actors || result.BytesPerFile != s.SizeKiB * 1024 || result.VerifiedReads != s.Actors * 3 || Double.IsNaN(result.CycleMs) || Double.IsInfinity(result.CycleMs) || result.CycleMs < 0) Fail("benchmark_incorrect_result");
                BenchmarkRunJournal.Complete(directory, id, index, clock, authorize);
                // Проверка после записи: поздний отзыв не превращается в успешный ответ.
                Call(authorize);
                DateTime end = clock();
                if (end.Kind != DateTimeKind.Utc || end.Ticks >= s.ExpiresUtcTicks) Fail("benchmark_run_closed");
                return result;
            }
        }
        /// <summary>
        /// Остановка ждёт не в очереди, а отказывает при занятом шаге.
        /// Повторять изменение файлов нельзя; после отказа вызывающий код сверяет статус.
        /// Проверка отсутствия файлов не заменяется пустым callback рабочего маршрута.
        /// </summary>
        public static BenchmarkRunJournal.Snapshot StopAndConfirm(string directory, BenchmarkRunJournal.Identity id,
            Action authenticateSameSession, Action verifyPayloadAbsent)
        {
            if (id == null) throw new ArgumentNullException("id");
            if (verifyPayloadAbsent == null) throw new ArgumentNullException("verifyPayloadAbsent");
            Call(authenticateSameSession);
            using (FileStream gate = Lease(directory))
            {
                BenchmarkRunJournal.Stop(directory, id, authenticateSameSession);
                return BenchmarkRunJournal.ConfirmCleanup(directory, id, authenticateSameSession, verifyPayloadAbsent);
            }
        }
    }
}
