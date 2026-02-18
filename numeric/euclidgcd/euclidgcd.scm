#!/usr/bin/guile -s
!#

(define (euclidgcd m n)
    (if (= n 0)
        m
        (euclidgcd n (remainder m n))))

(define (argAsInt args index default)
    (if (>= (length args) 3)
        (string->number (list-ref args index))
        default))

(let* ((args (command-line))
        (arg1 (argAsInt args 1 15))
        (arg2 (argAsInt args 2 10))
        (gcd (euclidgcd arg1 arg2)))
    (display arg1) (display " ") (display arg2)
    (display "\ngcd: ") (display gcd) (display "\n"))
