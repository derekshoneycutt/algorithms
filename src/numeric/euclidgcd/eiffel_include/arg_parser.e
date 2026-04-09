note
	description: "Parse first two integer command-line arguments with defaults"
	date: "$Date$"
	revision: "$Revision$"

expanded class
	ARG_PARSER
inherit
	ARGUMENTS

feature -- Access
	first_integer: INTEGER
		-- First parsed integer, or default value.
	second_integer: INTEGER
		-- Second parsed integer, or default value.

feature -- Argument parsing
	parse
		-- Parse first two integer arguments; keep defaults (15, 10) if unavailable.
		local
			arg: STRING
		do
			first_integer := 15
			second_integer := 10

			if argument_count > 0 then
				arg := argument (1)
				if arg /= Void then
					first_integer := arg.to_integer
				end
				if argument_count > 1 then
					arg := argument (2)
					if arg /= Void then
						second_integer := arg.to_integer
					end
				end
			end
		end

end
