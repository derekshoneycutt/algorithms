/*
 *  Calculate the GCD between two values and print it to the screen
 */
#include <print>
#include <cstdlib>

/**
 * Calculates the GCD using Euclid's method
 * 
 * @param m The first value to calculate the GCD for
 * @param n The second value to calculate the GCD for
 * @returns The calculated GCD
 */
int euclidgcd(int m, int n)
{
    int r = 0;
    while (n != 0)
    {
        r = m % n;
        m = n;
        n = r;
    }
    return m;
}

/**
 * The main entry point to the application
 * 
 * @param argc The number of arguments on the command line
 * @param argv The array of command line arguments given
 * @returns 0
 */
int main(int argc, char *argv[])
{
    int m = 15;
    int n = 10;

    if (argc >= 3)
    {
        m = std::stoi(argv[1]);
        n = std::stoi(argv[2]);
    }

    std::println("{} {}", m, n);
    std::println("gcd: {}", euclidgcd(m, n));

    return 0;
}
