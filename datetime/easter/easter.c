#include <stdio.h>
#include <stdbool.h>

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

// We use a state machine in C because no real coroutines
struct DateLoopState {
    struct Date current;
    int endYear;
};
struct DateLoopState init_easters(int startYear, int endYear)
{
    struct DateLoopState ret = {{0, 0, startYear - 1}, endYear};
    return ret;
}
bool next_easter(struct DateLoopState* state)
{
    int newYear = state->current.year + 1;
    if (newYear > state->endYear)
    {
        return false;
    }
    state->current = get_easter_for(newYear);
    return true;
}

void print_easters(struct DateLoopState easters)
{
    printf("Easters:\n");
    while (next_easter(&easters))
    {
        struct Date currDate = easters.current;
        printf("   %02d %s, %04d\n",
            currDate.day,
            currDate.month == 3 ? "March" : "April",
            currDate.year);
    }
}

int main (int argc, char *argv[])
{
    print_easters(init_easters(1950, 2050));
}

