

未使用の CSS クラスを洗い出すコマンド
$ for f in $(find src/ -type f -iname '*.tsx') ;do res="$(./undefined_css.sh "$f")"; [[ -n "$res" ]] && echo "== $f == \n$res" ;done

インポートされているか確認するコマンド
$ for f in $(find ./src -type f -iname '*.tsx' | awk -F/ '{print $NF}' | sed 's/.tsx$//'); do unset res; echo "== $f ==";rg "$f" ./src | grep import ;done
