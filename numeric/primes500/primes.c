#include <stdio.h>
#include <stdbool.h>

void set_primes(int primes[])
{
    int n = 3;
    primes[0] = 2;

    for (int j = 1; j < 500; ++j)
    {
        primes[j] = n;

        bool is_prime = false;
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

            is_prime = ((r != 0) && (q <= t));
        }
    }
}

void print_primes(int primes[])
{
    printf("First Five Hundred Primes\n");
    for (int i = 0; i < 50; ++i)
    {
        printf("     %04d %04d %04d %04d %04d %04d %04d %04d %04d %04d\n",
            primes[i], primes[50 + i], primes[100 + i], primes[150 + i],
            primes[200 + i], primes[250 + i], primes[300 + i],
            primes[350 + i], primes[400 + i], primes[450 + i]);
    }
}

int main (int argc, char *argv[])
{
    int primes[500];

    set_primes(primes);
    print_primes(primes);

    return 0;
}
