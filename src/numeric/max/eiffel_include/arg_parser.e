note
	description: "Parse command-line arguments with defaults"
	date: "$Date$"
	revision: "$Revision$"

expanded class
	ARG_PARSER
inherit
    ARGUMENTS
        redefine
            default_create
        end

create
    default_create

feature -- Access
    values : LINKED_LIST [INTEGER]
		-- Parsed integers, or default values.

feature -- Argument parsing
	parse
		-- Parse command-line arguments; keep defaults (15, 10) if unavailable.
		local
            i: INTEGER
			arg: STRING
		do
            values.wipe_out

			if argument_count > 0 then
                -- if we have arguments, loop through and parse them
                from
                    i := 1
                until
                    i > argument_count
                loop
                    arg := argument (i)
                    if arg /= Void then
                        values.extend (arg.to_integer)
                    end
                    i := i + 1
                end
			end

            if values.count < 1 then
                -- failing the above, just do 15 and 10 again
                values.extend (15)
                values.extend (10)
            end
		end

feature -- Initialization
	default_create
		do
			create values.make
		end

end
