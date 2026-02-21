#!/usr/bin/guile -s
!#
(use-modules (srfi srfi-1))

(define (mymax list)
    (fold (lambda (next curr)
                (if (> next curr)
                    next
                    curr))
          0 list))

(define (argsAsInts args default)
    (if (> (length args) 0)
        (fold (lambda (next vals)
                    (append vals (list (string->number next))))
              '() args)
        default))

(let* ((args (command-line))
       (list (argsAsInts (cdr args) '(15 10)))
       (max_value (mymax list)))
    (display "values: ") (display list)
    (display "\nmax: ") (display max_value) (display "\n"))
