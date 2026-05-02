--[[
    Get the maximum of some sequence of values
]]

-- Get the max of the values
function max(values)
    local current = 0
    for i = 1, #values do
        if current < values[i] then
            current = values[i]
        end
    end
    return current
end

local values = {}
if (#arg >= 2) then
    for i = 1, #arg do
        values[i] = tonumber(arg[i])
    end
else
    values[1] = 15
    values[2] = 10
end

print(string.format("values: %s\nmax: %d",
    table.concat(values, ", "), max(values)))
