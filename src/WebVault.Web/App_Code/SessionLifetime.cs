using System;
using System.Collections.Generic;

namespace WebVault
{
    // Pure lifetime policy. Does not authenticate, touch SQL, set cookies or revive sessions.
    public static class SessionLifetime
    {
        public sealed class Plan
        {
            public readonly bool RememberUntilDayEnd;
            public readonly DateTime ExpiresUtc, AbsoluteExpiresUtc;
            public Plan(bool remembered, DateTime expiresUtc, DateTime absoluteUtc)
            { RememberUntilDayEnd = remembered; ExpiresUtc = expiresUtc; AbsoluteExpiresUtc = absoluteUtc; }
        }
        static void RequireUtc(DateTime value)
        { if (value.Kind != DateTimeKind.Utc) throw new ArgumentException("utc_required"); }
        public static bool ReadRememberFlag(IDictionary<string,object> input)
        {
            if (input == null) throw new ArgumentNullException("input");
            object value;
            if (!input.TryGetValue("rememberUntilDayEnd", out value)) return false;
            if (!(value is bool)) throw new ArgumentException("invalid_remember_until_day_end");
            return (bool)value;
        }
        public static Plan Create(DateTime nowUtc, bool requested, bool isAdmin, bool mustChangePassword)
        {
            RequireUtc(nowUtc);
            bool remembered = requested && !isAdmin && !mustChangePassword;
            DateTime absolute = remembered ? nowUtc.AddHours(3).Date.AddDays(1).AddHours(-3) : nowUtc.AddHours(8);
            return new Plan(remembered, remembered ? absolute : nowUtc.AddMinutes(30), absolute);
        }
        // Caller must first reject revoked, inactive and idle-expired sessions in SQL.
        public static DateTime Renew(DateTime nowUtc, DateTime absoluteUtc, bool remembered)
        {
            RequireUtc(nowUtc); RequireUtc(absoluteUtc);
            if (nowUtc >= absoluteUtc) throw new InvalidOperationException("session_expired");
            if (remembered) return absoluteUtc;
            DateTime idle = nowUtc.AddMinutes(30);
            return idle < absoluteUtc ? idle : absoluteUtc;
        }
        public static DateTime? CookieExpiry(DateTime absoluteUtc, bool remembered)
        { RequireUtc(absoluteUtc); return remembered ? (DateTime?)absoluteUtc : null; }
    }
}
