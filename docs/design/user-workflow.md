# User Workflow

Komaeを使用した典型的な作品制作ワークフローを定義します。効率的な作業手順とベストプラクティスを示します。

## 基本ワークフロー概要

```
プロジェクト作成 → アセット準備 → ページ構成 → 詳細調整 → プレビュー確認 → エクスポート
     ↓              ↓           ↓         ↓           ↓            ↓
  新規/テンプレート   画像/テキスト    SpreadSheet   Individual    Preview     HTML/PNG
                   ドラッグ&ドロップ    一括編集      細部調整      リアルタイム   単一ファイル
```

## Step 1: プロジェクト作成

### 1.1 新規プロジェクト

**操作**: `File` → `New Project`

```
┌─────────────────────────────────────┐
│        New Project Dialog           │
├─────────────────────────────────────┤
│ Project Name: [私の物語           ] │
│ Description:  [キャラクターの日常  ] │
│                                     │
│ Canvas Size:                        │
│   Width:  [768   ] Height: [1024  ] │
│   ● Standard (768x1024)             │
│   ○ Custom                          │
│                                     │
│ Template:                           │
│   ● Empty Project                   │
│   ○ Comic Template                  │
│   ○ Illustration Template           │
│                                     │
│           [Cancel]     [Create]     │
└─────────────────────────────────────┘
```

**ベストプラクティス**:
- **明確な命名**: プロジェクト名は作品の内容が分かるように
- **適切なキャンバスサイズ**: 用途に応じた解像度選択
- **テンプレート活用**: 類似作品があれば既存テンプレートを利用

### 1.2 既存プロジェクト読み込み

**操作**: `File` → `Open Project` → `.komae`ファイル選択

## Step 2: アセット準備

### 2.1 画像アセットの追加

**方法1: ドラッグ&ドロップ**
```
1. エクスプローラーから画像ファイルを選択
2. Asset Windowにドラッグ&ドロップ
3. 自動的にImageAssetとして登録
```

**方法2: メニューから追加**
```
1. Asset Window右クリック → "Add Image Asset"
2. ファイルダイアログで画像選択
3. Asset設定ダイアログで詳細設定
```

**推奨アセット構成**:
```
📁 assets/
├── 📁 characters/          # キャラクター画像
│   ├── character_a_01.png  # 表情・ポーズ別
│   ├── character_a_02.png
│   └── character_b_01.png
├── 📁 backgrounds/         # 背景画像
│   ├── room_interior.png
│   └── outdoor_scene.png
├── 📁 effects/            # エフェクト画像
│   ├── speed_lines.png
│   └── sparkle_effect.png
└── 📁 fonts/              # フォントファイル
    ├── NotoSansJP-Regular.ttf
    └── ComicFont-Bold.ttf
```

### 2.2 テキストアセットの作成

**操作**: Asset Window右クリック → `Add Text Asset`

```
┌─────────────────────────────────────┐
│         Text Asset Settings        │
├─────────────────────────────────────┤
│ Name: [キャラクーAのセリフ        ] │
│                                     │
│ Default Text:                       │
│ ┌─────────────────────────────────┐ │
│ │ こんにちは！                    │ │
│ │ 今日は良い天気ですね。          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Font: [NotoSansJP-Regular ▼]       │
│ Size: [24  ] Color: [#FFFFFF ●]    │
│ Stroke: [2.0] Color: [#000000 ●]   │
│                                     │
│ ☑ Vertical Writing                 │
│                                     │
│           [Cancel]     [OK]         │
└─────────────────────────────────────┘
```

**テキストアセット命名規則**:
- `speech-character-a`: キャラクターAのセリフ用
- `narration`: ナレーション用
- `title-text`: タイトル・見出し用

### 2.3 AssetAttr（共有属性）の設定

**目的**: 複数のアセットで位置やサイズを共有

**操作**: ImageAsset編集画面で`[v]`ドロップダウン → `新規作成`

**推奨AssetAttr**:
```yaml
position_attrs:
  character-left:     # 左側立ち位置
    name: "キャラクター左側"
    pos_x: 150
    pos_y: 400
  
  character-center:   # 中央立ち位置
    name: "キャラクター中央"
    pos_x: 384
    pos_y: 400
  
  speech-balloon:     # セリフ吹き出し位置
    name: "セリフ位置"
    pos_x: 100
    pos_y: 100

size_attrs:
  character-standard: # 標準キャラクターサイズ
    name: "標準サイズ"
    width: 300
    height: 400
```

## Step 3: ページ構成（SpreadSheet）

### 3.1 基本的なページ作成

**操作**: SpreadSheet Windowで行を追加（右クリック → `Add Page`）

```
                Character A    Background     Speech         Effect
               ┌─────────────┬─────────────┬─────────────┬─────────────┐
       Page1   │ [x]         │ [x]         │ [x]         │ [ ]         │
               ├─────────────┼─────────────┼─────────────┼─────────────┤
       Page2   │ [x]         │ [x]         │ [x]         │ [ ]         │
               ├─────────────┼─────────────┼─────────────┼─────────────┤
       Page3   │ [x]         │ [x]         │ [ ]         │ [x]         │
               └─────────────┴─────────────┴─────────────┴─────────────┘
```

### 3.2 効率的な一括編集

**列全体の操作**:
- **列タイトルクリック**: 列全体を選択
- **右クリック**: 列の表示/非表示切り替え
- **ドラッグ**: 列の順序変更

**行全体の操作**:
- **Page名クリック**: ページ全体を選択
- **右クリック**: ページの複製・削除
- **ドラッグ**: ページの順序変更

**チェックボックス操作**:
```
✓ チェック済み: AssetInstanceが配置されている
□ 未チェック: 配置されていない
- グレーアウト: そのページには適用不可能
```

### 3.3 コピー&ペースト活用

**ページ間でのAssetInstance複製**:
```
1. 元のページのセルを選択
2. Ctrl+C（コピー）
3. 対象ページのセルを選択
4. Ctrl+V（ペースト）
→ AssetInstanceの設定がそのまま複製される
```

**範囲選択での一括操作**:
```
1. Shift+クリックで範囲選択
2. 一括でチェック/アンチェック
3. 一括で設定変更
```

## Step 4: 詳細調整（Individual Settings）

### 4.1 AssetInstance個別編集

**操作**: SpreadSheetのセル内部をクリック → モーダルウィンドウ表示

**ImageAssetInstance調整例**:
```
┌─────────────────────────────────────┐
│ Character A - Page 1               │
├─────────────────────────────────────┤
│ [Preview Image]    Position:        │
│                    ● Asset Default  │
│                    ○ character-left │
│                    ○ Override       │
│                      X:[200] Y:[300]│
│                                     │
│ Z-Index: [2]       Transform:       │
│ Opacity: ████▒▒▒▒ 0.8               │
│                    Scale: [1.2][1.0]│
│                    Rotate: [15°]    │
│                                     │
│ Mask Override:                      │
│ L:[10] T:[20] R:[310] B:[420]      │
│                                     │
│           [Cancel]     [Apply]      │
└─────────────────────────────────────┘
```

**調整パターン**:
- **位置微調整**: AssetAttr基準から少しずらす
- **表情切り替え**: 同キャラクターの別表情画像に変更
- **エフェクト重ね**: 透明度を下げて重ね合わせ効果

### 4.2 TextAssetInstance調整

**よくある調整**:
```yaml
# セリフの内容変更
override_text: |
  こんにちは！
  今日は良い天気ですね。
  散歩でもしませんか？

# フォント設定の個別調整
font_override:
  size: 20          # 元は24だが少し小さく
  color_in: "#FFFF00"  # 強調のため黄色に変更
```

## Step 5: プレビュー確認

### 5.1 リアルタイムプレビュー

**Preview Windowの活用**:
```
┌─────────────────────────────────────┐
│  [<] Page 1/5 [>]    [⚙️] [🔍+] [🔍-] │
├─────────────────────────────────────┤
│                                     │
│        [プレビュー画像]               │
│                                     │
│  - ページ切り替え: 矢印キー          │
│  - ズーム: Ctrl + マウスホイール     │
│  - フルスクリーン: F11              │
└─────────────────────────────────────┘
```

**確認ポイント**:
- **レイヤー順序**: z_indexが正しく反映されているか
- **文字の可読性**: フォントサイズ・色が適切か
- **画像の配置**: 意図した位置に表示されているか
- **全体のバランス**: ページ間の統一感があるか

### 5.2 プレビューモードでの調整

**操作**: Preview Window上で直接編集
```
1. Preview Window内の要素をクリック
2. 簡易調整パネルが表示
3. リアルタイムで変更を確認
4. 確定後、SpreadSheetに反映
```

## Step 6: エクスポート

### 6.1 HTML出力（推奨）

**操作**: `File` → `Export Project` → `Export to HTML`

```
┌─────────────────────────────────────┐
│          HTML Export Options       │
├─────────────────────────────────────┤
│ Output File: [story.html        📁] │
│                                     │
│ Options:                            │
│ ☑ Embed all assets (Base64)        │
│ ☑ Include viewer controls          │
│ ☑ Optimize image size              │
│ ☑ Minify HTML/CSS/JS              │
│                                     │
│ Image Quality: ████████▒▒ 80%      │
│                                     │
│           [Cancel]     [Export]     │
└─────────────────────────────────────┘
```

**出力結果**:
- **単一HTMLファイル**: 外部依存なし
- **Base64埋め込み**: 画像・フォントすべて含む
- **クリック操作**: 上半分クリックで前ページ、下半分で次ページ

### 6.2 PNG出力（印刷用）

**操作**: `File` → `Export Project` → `Export to PNG`

**用途別設定**:
```yaml
# Web用（軽量）
resolution: 72dpi
format: PNG
quality: medium

# 印刷用（高品質）
resolution: 300dpi
format: PNG
quality: high

# SNS用（正方形）
canvas_size: 1080x1080
resolution: 72dpi
format: PNG
```

## 効率化テクニック

### ワークフロー最適化

**1. テンプレート活用**
```
1. 基本構成が決まったらテンプレート保存
2. 新規プロジェクトでテンプレート選択
3. アセットの差し替えだけで新作完成
```

**2. AssetAttr戦略的活用**
```
# 事前に標準位置を定義
character-positions: 左側、中央、右側
speech-positions: 上部、中央、下部
effect-positions: 背景、前景
```

**3. ページ構成パターン**
```
導入ページ: Character + Background + Title
展開ページ: Character + Background + Speech
クライマックス: Character + Background + Speech + Effect
結末ページ: Character + Background + Conclusion
```

### ショートカット活用

**SpreadSheet操作**:
```
Ctrl+A: 全選択
Ctrl+C/V: コピー/ペースト
Ctrl+Z/Y: アンドゥ/リドゥ
Space: チェックボックス切り替え
Arrow Keys: セル移動
Tab: 次のセルに移動
```

**Preview操作**:
```
← →: ページ切り替え
Ctrl + Mouse Wheel: ズーム
F11: フルスクリーン
Esc: フルスクリーン解除
```

### 作業時の注意点

**プロジェクト管理**:
- 定期的な保存（Ctrl+S）
- バックアップの作成
- アセットファイルの整理

**パフォーマンス**:
- 大量の高解像度画像使用時はプレビュー品質を下げる
- 不要なAssetInstanceは削除
- 定期的なプロジェクトファイルの最適化

**品質管理**:
- Preview Windowでの最終確認
- 異なる画面サイズでの表示確認
- エクスポート後の動作確認

この系統的なワークフローにより、**効率的で高品質**な作品制作が可能になります。
