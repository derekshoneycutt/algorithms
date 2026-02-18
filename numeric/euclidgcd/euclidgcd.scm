#!/usr/bin/guile -s
!#

(define (euclidgcd m n)
    (if (= n 0)
        m
        (euclidgcd n (remainder m n))))


(define (argAsInt args index default)
    (let ((arg-list (cdr args)))
        (if (and (>= (length arg-list) 2)
                (string->number (list-ref arg-list (- index 1))))
            (string->number (list-ref arg-list (- index 1)))
            default)))


(define (main args)
    (let* ((arg1 (argAsInt args 1 15))
          (arg2 (argAsInt args 2 10))
          (gcd (euclidgcd arg1 arg2)))
        (display arg1) (display " ") (display arg2)
        (display "\ngcd: ") (display gcd) (display "\n")))

(main (command-line))
