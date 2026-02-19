
(defn euclidgcd [m n]
  (if (= n 0)
    m
    (euclidgcd n (rem m n))))

(defn argAsInt [args index default]
  (if (>= (count args) 3)
    (Integer/valueOf (nth args index))
    default))

(let [args *command-line-args*
      m (argAsInt args 1 15)
      n (argAsInt args 2 10)
      gcd (euclidgcd m n)]
  (printf "%d %d\ngcd: %d\n" m n gcd))

