#|
 |  This calculates the GCD for 2 numbers
 |#
#lang racket

(define (euclidgcd m n)
    (if (= n 0)
        m
        (euclidgcd n (remainder m n))))

(define (argAsInt args index default)
    (if (>= (vector-length args) 2)
        (string->number (vector-ref args index))
        default))

(let* ((args (current-command-line-arguments))
       (arg1 (argAsInt args 0 15))
       (arg2 (argAsInt args 1 10))
       (gcd (euclidgcd arg1 arg2)))
    (display arg1) (display " ") (display arg2)
    (display "\ngcd: ") (display gcd) (display "\n"))
