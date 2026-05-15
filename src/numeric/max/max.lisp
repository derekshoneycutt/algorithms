#|
 |  This application gets the maximum value of a sequence of values
 |#
(eval-when (:compile-toplevel :load-toplevel :execute)
    (require :asdf))

; Find the maximum value in a list
(defun mymax (values)
    (reduce (lambda (curr next)
            (if (> next curr)
                next
                curr))
           values))

; Get command line arguments as integers, or a default value otherwise
(defun args-as-int (args default)
    (if (< 0 (length args))
        (mapcar #'parse-integer args)
        default))

(let* ((args (uiop:command-line-arguments))
       (list (args-as-int args '(15 10)))
       (maxvalue (mymax list)))
    (format t "values: ~{~A~^, ~}~%max: ~a~%" list maxvalue))
