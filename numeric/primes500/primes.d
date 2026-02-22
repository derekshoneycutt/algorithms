import std.stdio;

void set_primes(int[] primes)
{
    int n = 3;
    primes[0] = 2;

    foreach (j; 1 .. 500)
    {
        primes[j] = n;

        bool is_prime =false;
        while (!is_prime)
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

            is_prime = (r != 0) && (q <= t);
        }
    }
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
    int[500] primes;

    set_primes(primes);
    print_primes(primes);
}
