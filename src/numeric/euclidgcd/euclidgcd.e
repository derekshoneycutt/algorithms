note
	description: "Euclid GCD application root class"
	date: "$Date$"
	revision: "$Revision$"

class
	EUCLIDGCD
inherit
    ARGUMENTS

create
	make

feature -- Euclid's GCD Algorithm
    euclidgcd (m, n: INTEGER): INTEGER
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


feature {NONE}

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
