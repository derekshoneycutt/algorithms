#include <print>
#include <vector>
#include <generator>
#include <algorithm>
#include <ranges>

std::generator<const int> prime_sieve()
{
    co_yield 2;
    std::vector<int> cache = {2};
    int candidate = 3;
    while (true)
    {
        if (std::all_of(cache.begin(), cache.end(),
            [=](int prime) { return candidate % prime != 0; }))
        {
            co_yield candidate;
            cache.push_back(candidate);
        }

        candidate += 2;
    }
}

std::vector<int> get_primes(const int count)
{
    auto view = prime_sieve() | std::views::take(count);
    std::vector<int> primes;
    for (const int prime : view)
    {
        primes.push_back(prime);
    }
    return primes;
}

void print_primes(const std::vector<int>& primes)
{
    std::println("First Five Hundred Primes");
    for (int i = 0; i < 50; ++i)
    {
        std::println(
            "     {:04} {:04} {:04} {:04} {:04} {:04} {:04} {:04} {:04} {:04}",
            primes[i], primes[50 + i], primes[100 + i], primes[150 + i],
            primes[200 + i], primes[250 + i], primes[300 + i],
            primes[350 + i], primes[400 + i], primes[450 + i]);
    }
}

int main (int argc, char *argv[])
{
    print_primes(get_primes(500));

    return 0;
}
