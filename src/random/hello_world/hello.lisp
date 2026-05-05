#|
    This just prints hello world to the screen
|#

#+(or) ; can also use `#+nil` like this
(format t "This doesn't print, commented out")

(format t "Hello, world!~%") ; Prints hello world
