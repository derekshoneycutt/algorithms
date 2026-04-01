/*
 *  Calculate the GCD between two values and print it all to the screen
 */

/// <summary>
/// Calculate the gcd between two values with Euclid's method
/// </summary>
/// <param name="m">The first value to calculate GCD for</param>
/// <param name="n">The second value to calculate GCD for</param>
/// <returns>The calculated GCD</returns>
static int euclidgcd(int m, int n)
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

// Get the values from the command line or use 15, 10
int m = 15;
int n = 10;
if (args.Length >= 2)
{
    (m, n) = (Int32.Parse(args[0]), Int32.Parse(args[1]));
}

Console.WriteLine($"{m} {n}");
Console.WriteLine($"gcd: {euclidgcd(m, n)}");
