
function get_easter_for(year)
    local g = (year % 19) + 1
    local c = (year // 100) + 1
    local x = (3 * c // 4) - 12
    local z = (((8 * c) + 5) // 25) - 5
    local d = (5 * year // 4) - x - 10
    local e = ((11 * g) + 20 + z - x) % 30
    if (e == 25 and g > 11) or e == 24 then
        e = e + 1
    end
    local n = 44 - e
    if n < 21 then
        n = n + 30
    end
    n = n + 7 - ((d + n) % 7)

    if n > 31 then
        return {n - 31, "April", year}
    end
    return {n, "March", year}
end

function get_easters(startYear, endYear)
    return coroutine.wrap(function()
        for currYear = startYear, endYear do
            local easter = get_easter_for(currYear)
            coroutine.yield(easter)
        end
    end)
end

function print_easters(easters)
    print("Easters:")
    for easter in easters do
        print(string.format("   %02d %s, %04d", easter[1], easter[2], easter[3]))
    end
end

print_easters(get_easters(1950, 2050))
