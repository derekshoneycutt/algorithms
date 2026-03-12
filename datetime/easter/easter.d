import std.concurrency;
import std.stdio;
import core.thread;

struct Date {
    int day;
    int month;
    int year;
}

Date get_easter_for(int year)
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

    return Date((n > 31) ? n - 31 : n, (n > 31) ? 4 : 3, year);
}

void generate_easters(int startYear, int endYear, Tid sendToTid)
{
    for (int year = startYear; year <= endYear; ++year)
    {
        send(sendToTid, get_easter_for(year));
        Fiber.yield();
    }
    send(sendToTid, "end");
}

void print_easters(Fiber eastersFiber)
{
    writeln("Easters:");
    bool receiving = true;
    while (receiving)
    {
        eastersFiber.call();
        receive(
            (Date date) {
                string month = "March";
                if (date.month == 4)
                {
                    month = "April";
                }
                writefln("   %02d %s %04d", date.day, month, date.year);
            },
            (string stop) {
                if (stop == "end")
                {
                    receiving = false;
                }
            }
        );
    }
}

void main(string[] args)
{
    auto mainTid = thisTid();
    print_easters(new Fiber({
        generate_easters(1950, 2050, mainTid);
    }));
}
