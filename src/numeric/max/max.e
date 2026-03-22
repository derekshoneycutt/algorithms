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

feature -- The Max algorithm
    maximum (values: LINKED_LIST [INTEGER]): INTEGER
        local
            c: INTEGER
        do
            across values as value loop
                if value > c then
                    c := value
                end
            end
            Result := c
        end

feature {NONE}

	make
        local
            i, m: INTEGER
            values: LINKED_LIST [INTEGER]
            arg : STRING
		do
            create values.make

            -- this time we loop through all integer arguments given and get max of all
            if argument_count > 0 then
                from
                    i := 1
                until
                    i > argument_count
                loop
                    arg := argument (i)
                    if arg.is_integer then
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

            m := maximum(values)

            print ("values: [")
            i := 0
            across values as value loop
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
