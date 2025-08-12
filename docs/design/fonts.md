## How to manage font

フォント管理システムは以下の3つのフォントタイプをサポートしています：

1. **ビルトインフォント（Built-in Fonts）** - アプリケーションに同梱されるフォント
2. **カスタムフォント（Custom Fonts）** - ユーザーが追加するローカルフォントファイル
3. **Google Fonts** - Google Fonts APIから提供される外部フォント

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
$ find . -type f | awk '{c=gsub("/","/");print c"\t"$0}' | sort -t'\t' -k1,1n | awk -F'\t' '{print $2}' | while read -r f ;do file "$f"| grep -q text && { printf '\n\n%s\n\n' "==> $f <=="; nkf -Lu -w "$f";} ;done
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

### Google Fonts

#### 概要

Google Fontsは、GoogleのWebフォントサービスから提供される外部フォントです。ユーザーはGoogle FontsのURLを指定することで、ローカルファイルをダウンロードすることなく、多種多様な高品質フォントを利用できます。

#### 技術実装

1. **フォント統合アーキテクチャ**
   - Google FontsはFontInfoエンティティでサポート
   - `isGoogleFont: true`フラグで識別
   - `googleFontUrl`フィールドで元のGoogle Fonts URLを保存

2. **URL解析とバリデーション**
   ```typescript
   // サポートされるURL形式（CSS2フォーマット）
   https://fonts.googleapis.com/css?family=Roboto
   https://fonts.googleapis.com/css?family=Open+Sans:400,700
   https://fonts.googleapis.com/css?family=Noto+Sans+JP&display=swap
   ```

3. **フォントID生成**
   ```typescript
   // SHA256ハッシュベースのフォントID生成
   const generateGoogleFontId = (url: string): string => {
     const hash = crypto.createHash('sha256').update(url).digest('hex');
     return `google-${hash.substring(0, 8)}`;
   };
   ```

4. **フォント名抽出**
   ```typescript
   // URL から family パラメータを抽出してフォント名を決定
   // 複数のfamilyがある場合は最初のもののみ使用
   // コロン区切りの場合は最初の部分のみ使用
   const parseGoogleFontUrl = (url: string): { name: string; id: string } | null => {
     const urlObj = new URL(url);
     const family = urlObj.searchParams.get('family');
     if (!family) return null;
     
     const fontName = family.split(':')[0].replace(/\+/g, ' ');
     const fontId = generateGoogleFontId(url);
     
     return { name: fontName, id: fontId };
   };
   ```

#### フォント読み込み方式

**CSS統合方式：**
```typescript
// App.tsx での動的フォント登録
fonts.forEach(font => {
  if (font.isGoogleFont && font.googleFontUrl) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = font.googleFontUrl;
    link.setAttribute('data-komae-google-font', font.id);
    document.head.appendChild(link);
  }
});
```

#### SVG生成でのフォント解決

Google Fontsは特別な名前解決プロセスを使用：

```typescript
// svgGeneratorCommon.ts での Google Fonts 対応
function resolveSvgFontName(fontId: string): string {
  if (fontInfoCache) {
    const font = fontInfoCache.find(f => f.id === fontId);
    if (font && font.isGoogleFont) {
      return font.name; // Google Fontsはフォント名を使用
    }
  }
  return fontId; // ビルトイン・カスタムフォントはIDを使用
}
```

#### データ構造拡張

**FontInfoインターフェース拡張：**
```typescript
interface FontInfo {
  id: string;
  name: string;
  path: string;
  filename?: string;
  license?: string;
  isGoogleFont?: boolean;    // Google Fontsフラグ
  googleFontUrl?: string;    // 元のGoogle Fonts URL
}
```

**FontRegistryEntry拡張：**
```typescript
interface FontRegistryEntry {
  id: string;
  name: string;
  filename: string;
  licenseFile?: string;
  license?: string;
  addedAt: string;
  isGoogleFont?: boolean;    // Google Fontsフラグ
  googleFontUrl?: string;    // 元のGoogle Fonts URL
}
```

#### ライセンス情報

Google Fontsのライセンス情報は以下の方式で提供：

1. **ライセンスモーダル統合**
   - Google Fontsの場合、専用のライセンスページリンクを表示
   - URL形式: `https://fonts.google.com/specimen/<URLエンコードしたフォント名>/license`

2. **外部ブラウザ連携**
   ```typescript
   // FontLicenseModal.tsx での実装
   const encodedFontName = encodeURIComponent(font.name);
   const licenseUrl = `https://fonts.google.com/specimen/${encodedFontName}/license`;
   window.electronAPI.system.openExternal(licenseUrl);
   ```

#### UI仕様

1. **フォント追加モーダル**
   - ラジオボタンで "Embed" と "Google Fonts" を切り替え
   - Google Fonts選択時にURL入力フィールドを表示
   - ヘルプモーダルで使用方法を説明

2. **ヘルプモーダル**
   - HTMLベースのレイアウト
   - Google Fontsリンクは外部ブラウザで開く
   - サンプルURLは赤文字でハイライト

3. **フォント管理画面**
   - Google Fontsは専用アイコンで識別
   - ライセンス情報ボタンから専用ライセンスページへリンク

#### パフォーマンス考慮事項

1. **遅延読み込み**
   - Google Fontsは`font-display: swap`を使用
   - 初回読み込み時のレイアウトシフトを最小化

2. **キャッシュ戦略**
   - Google FontsのCSSはブラウザキャッシュを活用
   - フォント情報はアプリケーション起動時にキャッシュ

3. **ネットワーク依存性**
   - オフライン環境では表示されない可能性
   - フォールバックフォントの適切な設定が重要
