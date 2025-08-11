## How to manage font

### ビルトインフォント（Built-in Fonts）

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
$ find . -type f | awk '{c=gsub("/","/");print c"\t"$0}' | sort -t'\t' -k1,1n | awk -F'\t' '{print $2}' | while read -r f ;do file "$f"| grep -q text && { echo "==> $f <=="; nkf -Lu -w "$f";} ;done
```

### カスタムフォント（Custom Fonts）

#### アプリケーション全体で共有されるカスタムフォント

カスタムフォントは、ユーザビリティを向上させるため、**アプリケーション全体で共有される方式**を採用する。一度追加したフォントは、今後作成する全プロジェクトで利用可能となる。

#### 保存場所

```
OS別のユーザーデータディレクトリ/fonts/
├── カスタムフォントファイル
├── ライセンスファイル
└── fonts-registry.json（フォント管理情報）
```

**OS別パス:**
- **macOS**: `~/Library/Application Support/Komae/fonts/`
- **Windows**: `%APPDATA%/Komae/fonts/`
- **Linux**: `~/.config/Komae/fonts/`

#### 技術実装

1. **フォント種別の分離**
   - ビルトインフォント: `public/fonts/`（読み取り専用）
   - グローバルカスタムフォント: `userData/fonts/`（アプリ全体で共有）

2. **komae-asset://プロトコルの拡張**
   ```
   komae-asset://builtin/fonts/...  → public/fonts/
   komae-asset://global/fonts/...   → userData/fonts/
   ```

3. **フォント管理レジストリ**
   ```json
   {
     "version": "1.0",
     "fonts": [
       {
         "id": "global-12345",
         "name": "MyCustomFont",
         "filename": "MyCustomFont.ttf",
         "licenseFile": "MyCustomFont_LICENSE.txt",
         "license": "ライセンステキスト全文...",
         "addedAt": "2025-01-01T00:00:00Z"
       }
     ]
   }
   ```

#### メリット

**ユーザビリティ:**
- 一度追加したフォントは全プロジェクトで利用可能
- フォントライブラリの構築が可能
- プロジェクト間でのフォント重複回避

**技術的利点:**
- プロジェクトファイルサイズの削減
- フォント管理の一元化
- ライセンス情報の統一管理
- Electronパッケージ化後も書き込み可能

#### 実装クラス設計

```typescript
class FontManager {
  // 既存機能
  private currentProjectPath: string | null;
  private fontCache: Map<string, FontInfo>;
  
  // グローバルフォント管理機能
  private globalFontsDir: string;
  private registryFile: string;
  private globalFontCache: Map<string, FontInfo>;

  constructor() {
    this.globalFontsDir = path.join(app.getPath('userData'), 'fonts');
    this.registryFile = path.join(this.globalFontsDir, 'fonts-registry.json');
    this.ensureGlobalDirectories();
  }

  // 既存メソッド（拡張）
  async addCustomFont(fontPath: string, licensePath?: string): Promise<FontInfo>
  async removeCustomFont(fontId: string): Promise<void>
  async getAvailableFonts(project?: any): Promise<FontInfo[]>
  
  // 新規メソッド
  private ensureGlobalDirectories(): void
  private loadGlobalRegistry(): Promise<FontRegistry>
  private saveGlobalRegistry(registry: FontRegistry): Promise<void>
  private loadGlobalFonts(): Promise<FontInfo[]>
}
```

#### フォント取得ロジック

```typescript
async getAvailableFonts(): Promise<FontInfo[]> {
  return [
    ...await this.loadBuiltinFonts(),    // public/fonts/
    ...await this.loadGlobalFonts()     // userData/fonts/
  ];
}
```
