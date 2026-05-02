note
	description: "Find the maximum value from a given set of values"
	date: "$Date$"
	revision: "$Revision$"

class
	MAXIMUM [T -> COMPARABLE]

feature -- The Max algorithm
    max (values: LINKED_LIST [T]): T
        local
            c: T
        do
            c := values.first
            across
                values as value
            loop
                if value > c then
                    c := value
                end
            end
            Result := c
        end

end
