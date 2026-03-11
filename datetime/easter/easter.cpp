#include <print>
#include <vector>
#include <generator>
#include <algorithm>
#include <ranges>

struct Date {
    int day;
    int month;
    int year;
};

struct Date get_easter_for(int year)
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

    struct Date ret = {(n > 31) ? n - 31 : n, (n > 31) ? 4 : 3, year};
    return ret;
}

std::generator<const struct Date> get_easters(int startYear, int endYear)
{
    for (int year = startYear; year <= endYear; ++year)
    {
        co_yield get_easter_for(year);
    }
}

void print_easters(std::generator<const struct Date> generator)
{
    std::println("Easters:");
    for (auto date : generator)
    {
        std::println("   {:02} {}, {:04}",
            date.day,
            date.month == 3 ? "March": "April",
            date.year);
    }
}

int main (int argc, char *argv[])
{
    print_easters(get_easters(1950, 2050));

    return 0;
}
