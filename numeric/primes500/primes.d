import std.stdio;
import std.concurrency;
import std.algorithm.searching;
import std.range;
import std.array;

void prime_sieve()
{
    yield(2);
    int[] cache = [2];
    int candidate = 3;
    while (true)
    {
        if (all!((prime) => candidate % prime != 0)(cache))
        {
            yield(candidate);
            cache ~= candidate;
        }

        candidate += 2;
    }
}

int[] get_primes(const int count)
{
    auto gen = new Generator!int(&prime_sieve);
    return gen.take(count).array;
}

void print_primes(int[] primes)
{
    writeln("First Five Hundred Primes");
    foreach (i; 0 .. 50)
    {
        writefln("     %04d %04d %04d %04d %04d %04d %04d %04d %04d %04d",
            primes[i], primes[50 + i], primes[100 + i], primes[150 + i],
            primes[200 + i], primes[250 + i], primes[300 + i],
            primes[350 + i], primes[400 + i], primes[450 + i]);
    }
}

void main(string[] args)
{
    print_primes(get_primes(500));
}
