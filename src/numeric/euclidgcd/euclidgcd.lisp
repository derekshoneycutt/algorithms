#|
 |  This calculates the GCD for 2 numbers
 |#
(eval-when (:compile-toplevel :load-toplevel :execute)
  (require :asdf))

; Calculate the GCD with Euclid's algorithm in recursive form
(defun euclid-gcd (m n)
   (if (= n 0)
       m
       (euclid-gcd n (mod m n))))

; Get a specified argument as an integer, or a default value otherwise
(defun arg-as-int (args index default)
    (if (< index (length args))
        (parse-integer (nth index args))
        default))

; Try to get the first 2 command line arguments or 15, 10 and calculate/display gcd
(let* ((args (uiop:command-line-arguments))
       (arg1 (arg-as-int args 0 15))
       (arg2 (arg-as-int args 1 10))
       (gcd (euclid-gcd arg1 arg2)))
      (format t "~a ~a~%gcd: ~a~%" arg1 arg2 gcd))
