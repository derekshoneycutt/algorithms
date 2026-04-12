#! /bin/sh

clojure_compile() {
  retValue=0
  mkdir -p ./output/src/algo ./output/resources
  do_update_source=0
  if [ ! -f "./output/src/algo/main.clj" ]; then
    do_update_source=1
  elif [ -n "$(find "./$fileName" -prune -newer "./output/src/algo/main.clj" 2>/dev/null)" ]; then
    do_update_source=1
  fi
  if [ "$do_update_source" -eq 1 ]; then
    printf '(ns algo.main (:gen-class))\n(defn -main [& args]\n  (binding [*command-line-args* (into ["%s"] args)]\n    (load-string (slurp (clojure.java.io/resource "%s")))))\n' "./$fileName" "$fileName" > "./output/src/algo/main.clj"
    cp "./$fileName" ./output/resources/
  fi

  if [ ! -f "./output/project.clj" ]; then
    template_content=$(cat ../../../templates/template.project.clj)
    get_variabled_string "$template_content" > "./output/project.clj"
  fi

  do_lein_uberjar=0
  if [ ! -f "./output/target/uberjar/$fileNameWithoutExt-1.0.0-standalone.jar" ]; then
    do_lein_uberjar=1
  elif [ -n "$(find "./$fileName" -prune -newer "./output/target/uberjar/$fileNameWithoutExt-1.0.0-standalone.jar" 2>/dev/null)" ]; then
    do_lein_uberjar=1
  fi
  if [ "$do_lein_uberjar" -eq 1 ]; then
    cd ./output
    echo "LEIN_VERBOSE=true lein uberjar" > ./clojure-build-last
    LEIN_VERBOSE=true lein uberjar >> ./clojure-build-last 2>&1
    retValue="$?"
    echo "-- lein returned: $retValue" >> ./clojure-build-last
    cd ..
  fi
  return "$retValue"
}
clojure_run() {
  java -cp "./output/target/uberjar/$fileNameWithoutExt-1.0.0-standalone.jar" clojure.main -m algo.main "$@"
  return "$?"
}
clojure_archive() {
  default_lang_archive "$@"
}