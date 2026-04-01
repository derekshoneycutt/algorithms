note
	description: "Euclid GCD application root class"
	date: "$Date$"
	revision: "$Revision$"

class
	EUCLIDGCD
inherit
    ARGUMENTS -- We get command line arguments in this class

create
	make

feature -- Euclid's GCD Algorithm
    euclidgcd (m, n: INTEGER): INTEGER
        -- Gets the greatest common denominator for 2 numbers with Euclid's algorithm
        --
        -- `m`: The first integer to get the common denominator for
        -- `n`: The second integer to get the common denominator for
        -- `Result`: Will be the final, calculated greatest common denominator
        local
            a, b, r: INTEGER
        do
            a := m
            b := n
            from
            until b = 0
            loop
                r := a \\ b
                a := b
                b := r
            end
            Result := a
        end


feature {NONE} -- Main application entry

	make
        local
            m, n, gcd: INTEGER
            arg : STRING
		do
            m := 15
            n := 10

            if argument_count > 1 then
                arg := argument (1)
                m := arg.to_integer
                arg := argument (2)
                n := arg.to_integer
            end

            gcd := euclidgcd (m, n)
            print (m.out + " " + n.out + "%Ngcd: " + gcd.out + "%N")
		end

end
