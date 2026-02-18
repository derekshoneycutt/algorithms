(ns euclidgcd
  (:gen-class))

(defn euclidgcd
  "Does the gcd calculation"
  [m n] 
  (if (= (rem m n) 0)
    n
    (euclidgcd n (rem m n))))

(defn -main
  "Calculates greatest common denominator via Euclid's method."
  []
  (let [m 15
        n 10]
    (printf "%d %d\ngcd: %d\n" m n (euclidgcd m n))
    (flush)
    (System/exit 0)))
