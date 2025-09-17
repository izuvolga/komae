#!/bin/bash

readonly THIS_DIR="$(cd -- "$( dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"

main () {
  local tmpfile="/tmp/used_classes.txt"
  local target="$1"
  trap 'rm -f "$tmpfile"' EXIT
  < "$target" grep -o -E 'className="[^"]+"'  | sort -u | awk -F'"' '{print $2}' | fmt -1 > "$tmpfile"
  comm -23 <(sort -u "$tmpfile") <(find "$THIS_DIR"/src -type f -iname '*css' -print0 | xargs -0 grep -h -of "$tmpfile" | sort -u)
}

main ${1+"$@"}
