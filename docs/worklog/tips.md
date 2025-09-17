

tsx から 未定義 CSS クラスを洗い出すコマンド
$ for f in $(find src/ -type f -iname '*.tsx') ;do res="$(./find_undefined_css_in_tsx.sh "$f")"; [[ -n "$res" ]] && echo "== $f == \n$res" ;done

インポートされているか確認するコマンド
$ for f in $(find ./src -type f -iname '*.tsx' | awk -F/ '{print $NF}' | sed 's/.tsx$//'); do unset res; echo "== $f ==";rg "$f" ./src | grep import ;done

CSS から 未使用の CSS クラスを洗い出すコマンド
for f in $(find ./src -type f -iname '*.css');do res="$(./find_unused_css_in_css.sh "$f" | awk NF)"; [[ -n "$res" ]] && echo "== $f ==\n$res"; done
