using System;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;

namespace WebVault
{
    public static class AuthCrypto
    {
        public const int Iterations = 600000;
        public const string Algorithm = "PBKDF2-HMAC-SHA256";
        [DllImport("bcrypt.dll", CharSet = CharSet.Unicode, ExactSpelling = true)]
        private static extern int BCryptOpenAlgorithmProvider(out IntPtr handle, string algorithm, string implementation, uint flags);
        [DllImport("bcrypt.dll", ExactSpelling = true)]
        private static extern int BCryptDeriveKeyPBKDF2(IntPtr handle, byte[] password, uint passwordLength, byte[] salt, uint saltLength, ulong iterations, [Out] byte[] output, uint outputLength, uint flags);
        [DllImport("bcrypt.dll", ExactSpelling = true)]
        private static extern int BCryptCloseAlgorithmProvider(IntPtr handle, uint flags);
        private static readonly Lazy<bool> Tested = new Lazy<bool>(SelfTest);

        public static byte[] Random(int count)
        {
            byte[] bytes = new byte[count];
            using (RandomNumberGenerator rng = RandomNumberGenerator.Create()) rng.GetBytes(bytes);
            return bytes;
        }
        public static string Token() { return Convert.ToBase64String(Random(32)); }
        public static byte[] Hash(string text)
        {
            using (SHA256 sha = SHA256.Create()) return sha.ComputeHash(Encoding.UTF8.GetBytes(text));
        }
        public static bool Equal(byte[] a, byte[] b)
        {
            if (a == null || b == null || a.Length != b.Length) return false;
            int difference = 0;
            for (int i = 0; i < a.Length; i++) difference |= a[i] ^ b[i];
            return difference == 0;
        }
        private static byte[] Derive(string password, byte[] salt, int iterations)
        {
            IntPtr handle = IntPtr.Zero;
            byte[] input = Encoding.UTF8.GetBytes(password);
            byte[] output = new byte[32];
            try
            {
                int status = BCryptOpenAlgorithmProvider(out handle, "SHA256", null, 8);
                if (status != 0) throw new CryptographicException("CNG provider failed.");
                status = BCryptDeriveKeyPBKDF2(handle, input, (uint)input.Length, salt, (uint)salt.Length, (ulong)iterations, output, (uint)output.Length, 0);
                if (status != 0) throw new CryptographicException("CNG derivation failed.");
                return output;
            }
            finally
            {
                Array.Clear(input, 0, input.Length);
                if (handle != IntPtr.Zero) BCryptCloseAlgorithmProvider(handle, 0);
            }
        }
        private static bool SelfTest()
        {
            byte[] actual = Derive("password", Encoding.ASCII.GetBytes("salt"), 1);
            string hex = BitConverter.ToString(actual).Replace("-", "").ToLowerInvariant();
            if (hex != "120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b")
                throw new CryptographicException("PBKDF2 self-test failed.");
            return true;
        }
        public static byte[] Password(string password, byte[] salt, int iterations)
        {
            if (!Tested.Value) throw new CryptographicException();
            if (iterations < 600000 || iterations > 2000000) throw new CryptographicException("Unsupported password parameters.");
            return Derive(password, salt, iterations);
        }
    }
}
