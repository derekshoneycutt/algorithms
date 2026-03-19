note
	description: "hello application root class"
	date: "$Date$"
	revision: "$Revision$"

class
	HELLO

create
	make

feature {NONE}

	make
		do
			print ("Hello, world!%N")
		end

end
