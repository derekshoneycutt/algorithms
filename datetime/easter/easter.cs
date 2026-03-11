
static DateOnly GetEasterFor(int year)
{
    int g = (year % 19) + 1;
    int c = (year / 100) + 1;
    int x = (3 * c / 4) - 12;
    int z = (((8 * c) + 5) / 25) - 5;
    int d = (5 * year / 4) - x - 10;
    int e = ((11 * g) + 20 + z - x) % 30;
    if (((e == 25) && (g > 11)) || (e == 24))
    {
        ++e;
    }
    int n = 44 - e;
    if (n < 21)
    {
        n += 30;
    }
    n += 7 - ((d + n) % 7);

    return new(year, (n > 31) ? 4 : 3, (n > 31) ? n - 31 : n);
}

static IEnumerable<DateOnly> GetEasters(int startYear, int endYear)
{
    for (int year = startYear; year <= endYear; ++year)
    {
        yield return GetEasterFor(year);
    }
}

Console.WriteLine("Easters:");
foreach (DateOnly easter in GetEasters(1950, 2050))
{
    Console.WriteLine($"   {easter:dd MMMM, yyyy}");
}
