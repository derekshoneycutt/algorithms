using Dates

function get_easter_for(year)
    g = (year % 19) + 1
    c = (year ÷ 100) + 1
    x = (3 * c ÷ 4) - 12
    z = (((8 * c) + 5) ÷ 25) - 5
    d = (5 * year ÷ 4) - x - 10
    e = ((11 * g) + 20 + z - x) % 30
    if (e == 25 && g > 11) || e == 24
        e += 1
    end
    n = 44 - e
    if n < 21
        n += 30
    end
    n += 7 - ((d + n) % 7)

    if n > 31
        return Date(year, 4, n - 31)
    end
    return Date(year, 3, n)
end

function generate_easters(start_year, end_year, channel::Channel)
    for year in start_year:end_year
        easter = get_easter_for(year)
        put!(channel, easter)
    end
    close(channel)
end

function print_easters(easters::Channel)
    println("Easters:")
    for easter in easters
        println(Dates.format(easter, "   dd U, yyyy"))
    end
end

easters = Channel(100)
t = @task generate_easters(1950, 2050, easters)
schedule(t)
print_easters(easters)
wait(t)
