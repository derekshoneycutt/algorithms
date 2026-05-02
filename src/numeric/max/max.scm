; This program finds the maximum value of a sequence of values

(use-modules (srfi srfi-1))

; Find the maximum value in a list
(define (mymax list)
    (fold (lambda (next curr)
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
(let* ((args (command-line))
       (list (argsAsInts (cdr args) '(15 10)))
       (max_value (mymax list)))
    (display "values: ") (display list)
    (display "\nmax: ") (display max_value) (display "\n"))
