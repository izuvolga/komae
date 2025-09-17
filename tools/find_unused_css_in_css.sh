#!/bin/bash

readonly THIS_DIR="$(cd -- "$( dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"

# for f in $(find ./src -type f -iname '*.css');do echo "== $f =="; ./find_unused_css_in_css.sh $f; done
main () {
  local target="$1"
  for class in $(grep -h -oE '^\.[^ ]+ {' "$target" | sed 's/ {$//' | sed 's/:.*$//;s/^\.//' | sort -u)
  do
    res="$(grep "$class" -r "$THIS_DIR/src" --exclude="$target" --exclude='*.css' --include='*.tsx' --include='*.ts')"
    if [ -z "$res" ]; then
      echo "$class"
    else
      :
      #echo "Used: $class"
      #echo "$res"
    fi
  done
}

main ${1+"$@"}
