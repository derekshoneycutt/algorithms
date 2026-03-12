package datetime.easter;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Iterator;

class EasterGenerator implements Iterable<LocalDate>
{
    private int endYear;
    private int startYear;

    public EasterGenerator(int startYear, int endYear)
    {
        this.endYear = endYear;
        this.startYear = startYear;
    }

    @Override
    public Iterator<LocalDate> iterator()
    {
        return new Iterator<LocalDate>()
        {
            private int currentYear = startYear;

            private static LocalDate GetEasterFor(int year)
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

                return LocalDate.of(year, (n > 31) ? 4 : 3, (n > 31) ? n - 31 : n);
            }

            @Override
            public boolean hasNext()
            {
                return currentYear <= endYear;
            }

            @Override
            public LocalDate next()
            {
                return GetEasterFor(currentYear++);
            }
        };
    }
}

public class easter
{
    private static void print_easters(Iterable<LocalDate> easters)
    {
        System.out.println("Easters:");
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("   dd MMMM, yyyy");
        for (LocalDate easter : easters)
        {
            System.out.println(easter.format(formatter));
        }
    }

    public static void main(String[] args)
    {
        print_easters(new EasterGenerator(1950, 2050));
    }
}
