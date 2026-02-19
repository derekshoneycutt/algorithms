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

int m = 15;
int n = 10;

if (args.Length >= 2)
{
    (m, n) = (Int32.Parse(args[0]), Int32.Parse(args[1]));
}

Console.WriteLine($"{m} {n}");
Console.WriteLine($"gcd: {euclidgcd(m, n)}");
