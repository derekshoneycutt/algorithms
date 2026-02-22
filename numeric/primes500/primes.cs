static List<int> GetPrimes()
{
    List<int> primes = new(500);
    int n  = 3;
    primes.Add(2);

    for (int j = 1; j < 500; ++j)
    {
        primes.Add(n);

        bool isPrime = false;
        while (!isPrime)
        {
            n += 2;

            int q = 9999;
            int r = 1;
            int t = 0;
            for (int k = 1; (r != 0) && (q > t); ++k)
            {
                t = primes[k];
                q = n / t;
                r = n % t;
            }

            isPrime = (r != 0) && (q <= t);
        }
    }
    return primes;
}

static void PrintPrimes(List<int> primes)
{
    Console.WriteLine("First Five Hundred Primes");
    for (int i = 0; i < 50; ++i)
    {
        Console.WriteLine($"     {primes[i]:0000} {primes[i + 50]:0000}" +
            $" {primes[i + 100]:0000} {primes[i + 150]:0000}" +
            $" {primes[i + 200]:0000} {primes[i + 250]:0000}" +
            $" {primes[i + 300]:0000} {primes[i + 350]:0000}" +
            $" {primes[i + 400]:0000} {primes[i + 450]:0000}");
    }
}

PrintPrimes(GetPrimes());
