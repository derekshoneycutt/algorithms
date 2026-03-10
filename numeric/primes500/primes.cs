
static IEnumerable<int> PrimeSieve()
{
    yield return 2;
    List<int> cache = [2];
    int candidate = 3;
    while (true)
    {
        if (cache.All(prime => candidate % prime != 0))
        {
            yield return candidate;
            cache.Add(candidate);
        }

        candidate += 2;
    }
}

static List<int> GetPrimes(int count)
{
    return [.. PrimeSieve().Take(count)];
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

PrintPrimes(GetPrimes(500));
