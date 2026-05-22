#|
 |  This application gets the maximum value of a sequence of values
 |#
#lang racket

; Find the maximum value in a list
(define (mymax list)
    (foldl (lambda (next curr)
                (if (> next curr)
                    next
                    curr))
          0 list))

; Get the command line arguments as integers
(define (argsAsInts args default)
    (if (> (length args) 0)
        (map (lambda (val) (string->number val)) args)
        default))

; Get the values and the max, and print the values
(let* ((args (vector->list (current-command-line-arguments)))
       (list (argsAsInts args '(15 10)))
       (max_value (mymax list)))
    (display "values: ") (display list)
    (display "\nmax: ") (display max_value) (display "\n"))
