note
	description: "Maximum Integer application root class"
	date: "$Date$"
	revision: "$Revision$"

class
	MAX
inherit
    ARGUMENTS

create
	make

feature -- Main entry point
	make
        local
            i, m: INTEGER
            parser: ARG_PARSER
            maximum: MAXIMUM [INTEGER]
		do
            -- Parse the command line args, get the max, and print it
            create parser
            parser.parse

            create maximum
            m := maximum.max(parser.values)

            print ("values: [")
            i := 0
            -- NOTE: Liberty Eiffel standard doesn't like the across loops
            --  because it's not the old standard that it follows. EiffelStudio
            --  offers newer, nice features like this loop style. We will go
            --  ahead and use that here, knowing the limitation. This sample
            --  no longer works with LibertyEiffel
            across
                parser.values as value
            loop
                if i < 1 then
                    print (value.item.out)
                else
                    print (", " + value.item.out)
                end
                i := i + 1
            end
            print ("]%Nmax: " + m.out + "%N")
		end

end
