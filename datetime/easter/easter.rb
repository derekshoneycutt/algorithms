require 'date'

def get_easter_for(year)
    g = (year % 19) + 1
    c = (year / 100) + 1
    x = (3 * c / 4) - 12
    z = (((8 * c) + 5) / 25) - 5
    d = (5 * year / 4) - x - 10
    e = ((11 * g) + 20 + z - x) % 30
    if ((e == 25) && (g > 11)) || (e == 24)
        e = e + 1
    end
    n = 44 - e
    if n < 21
        n += 30
    end
    n += 7 - ((d + n) % 7)

    if n > 31
        return Date.new(year, 4, n - 31)
    end
    return Date.new(year, 3, n)
end

def get_easters(start_year, end_year)
    Enumerator.new do |yielder|
        (start_year .. end_year).each do |year|
            yielder << get_easter_for(year)
        end
    end
end

def print_easters(easters)
    puts "Easters:"
    easters.each do |easter|
        puts easter.strftime("   %d %B, %Y")
    end
end

print_easters(get_easters(1950, 2050))
