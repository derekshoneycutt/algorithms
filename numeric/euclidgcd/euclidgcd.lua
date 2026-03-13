
function euclidgcd(m, n)
    local r = 0
    while n ~= 0 do
        r = m % n
        m = n
        n = r
    end
    return m
end

local m = 15
local n = 10

if #arg >= 2 then
    m = arg[1]
    n = arg[2]
end

print(string.format("%d %d\ngcd: %d", m, n, euclidgcd(m, n)))
