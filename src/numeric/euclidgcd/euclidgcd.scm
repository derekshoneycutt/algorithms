; Calculates the GCD of two values and prints it all to the screen

; Calculate the GCD with the recursive form of Euclid's algorithm
(define (euclidgcd m n)
    (if (= n 0)
        m
        (euclidgcd n (remainder m n))))

; Get a command line argument as an argument or return a default value
(define (argAsInt args index default)
    (if (>= (length args) 3)
        (string->number (list-ref args index))
        default))

; Try to get the first two command line arguments and calculate and display the gcd
(let* ((args (command-line))
       (arg1 (argAsInt args 1 15))
       (arg2 (argAsInt args 2 10))
       (gcd (euclidgcd arg1 arg2)))
    (display arg1) (display " ") (display arg2)
    (display "\ngcd: ") (display gcd) (display "\n"))
