#|
 |  This calculates the GCD for 2 numbers
 |#
#lang racket

; Calculate the GCD with Euclid's algorithm in recursive form
(define (euclidgcd m n)
    (if (= n 0)
        m
        (euclidgcd n (remainder m n))))

; Get a specified argument as an integer, or a default value otherwise
(define (argAsInt args index default)
    (if (>= (vector-length args) 2)
        (string->number (vector-ref args index))
        default))

; Try to get the first 2 command line arguments or 15, 10 and calculate/display gcd
(let* ((args (current-command-line-arguments))
       (arg1 (argAsInt args 0 15))
       (arg2 (argAsInt args 1 10))
       (gcd (euclidgcd arg1 arg2)))
    (display arg1) (display " ") (display arg2)
    (display "\ngcd: ") (display gcd) (display "\n"))
