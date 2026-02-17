static int euclidgcd(int m, int n)
{
    int r = m % n;
    while (r != 0)
    {
        m = n;
        n = r;
        r = m % n;
    }
    return n;
}

int v_1 = 10;
int v_2 = 15;

if (args.Length >= 2)
{
    (v_1, v_2) = (Int32.Parse(args[0]), Int32.Parse(args[1]));
}

Console.WriteLine($"{v_1} {v_2}");
Console.WriteLine($"gcd: {euclidgcd(v_1, v_2)}");
