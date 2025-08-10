## How to manage font

ビルトインのフォントは、プロジェクトの public/fonts ディレクトリに格納されている。
フォント名のファイルと、そのファイル名と同じ名前のtxtファイルが存在する。
txtファイルには、フォントのライセンス情報が記載されている。

例:
```
public/fonts/
├── Rounded-X M+ 1p.ttf
├── Rounded-X M+ 1p.txt
├── Mansalva.ttf
├── Mansalva.txt
└── ...
```

フォントが複数のライセンスファイルやREADMEがある場合は、以下のコマンドでテキストファイルをUTF-8に変換して、内容を一つのファイルにまとめたものを格納する。

```
find . -type f | awk '{c=gsub("/","/",$0);print c"\t"$0}' | sort -t'\t' -k1,1n | awk -F'\t' '{print $2}' | while read -r f ;do file "$f"| grep -q text && { echo "==> $f <=="; nkf -Lu -w "$f";} ;done
```
