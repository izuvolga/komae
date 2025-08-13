# SVG Structure

本プロジェクトでは、複数ページのコンテンツを単一の SVG 内で効率的に管理する。
アセットの重複を避けることで、ファイル容量を大幅に節約し、プロジェクト全体で共通のアセットを使いまわす仕組みを実現する。
これにより、HTMLエクスポート時の容量効率と読み込み速度が向上する。

## 統合SVG構造

```html
<!-- プロジェクト全体を包含する統合SVG -->
<svg
  width="768"
  height="1024"
  viewBox="0 0 768 1024"
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink"
>
    <defs>
        <!-- プロジェクト全体で使用される ImageAsset のマスク情報を宣言 -->
        <clipPath id="mask-id-circle">
            <path d="..パス指定"/>
        </clipPath>
        <clipPath id="mask-id-rect">
            <rect x="0" y="0" width="100" height="100"/>
        </clipPath>
    </defs>

    <!-- プロジェクト全体で使用される全 ImageAsset を一度だけ定義 -->
    <g id="assets">
        <g visibility="hidden">
            <g id="img-background" opacity="1.0">
                <image id="image-img-background" xlink:href="data:image/png;base64,ABCDEFG..." 
                       width="768" height="1024" x="0" y="0" />
            </g>
            <g id="img-character-a" opacity="1.0">
                <image id="image-img-character-a" xlink:href="data:image/png;base64,HIJKLMN..." 
                       width="320" height="440" x="200" y="300" />
            </g>
            <g id="img-effect" opacity="0.8">
                <image id="image-img-effect" xlink:href="data:image/png;base64,OPQRSTU..." 
                       width="400" height="300" x="100" y="50" />
            </g>
        </g>
    </g>

    <!-- ページ1の描画内容 (z_index順: background=0, character=1, speech=15) -->
    <g id="page-1" style="display: block;">
        <use href="#img-background" opacity="1.0" />
        <use href="#img-character-a" transform="scale(1.2,1.2)" opacity="0.9" />
        <!-- TextAsset インライン要素 (text-speech, z_index=15) -->
        <g opacity="1.0">
            <text x="150" y="100" font-family="Noto Sans JP" font-size="20" 
                  stroke="#000000" fill="#FFFFFF" stroke-width="2" writing-mode="vertical-rl">
                <tspan x="150" y="100">こ</tspan>
                <tspan x="150" dy="28">ん</tspan>
                <tspan x="150" dy="28">に</tspan>
                <tspan x="150" dy="28">ち</tspan>
                <tspan x="150" dy="28">は</tspan>
                <tspan x="122" y="100">！</tspan>
                <tspan x="94" y="100">お</tspan>
                <tspan x="94" dy="28">元</tspan>
                <tspan x="94" dy="28">気</tspan>
                <!-- 以下省略 -->
            </text>
        </g>
    </g>

    <!-- ページ2の描画内容 (z_index順: background=0, character=1, speech=10) -->
    <g id="page-2" style="display: none;">
        <use href="#img-background" opacity="1.0" />
        <use href="#img-character-a" transform="translate(300,400) scale(0.8,0.8)" opacity="1.0" />
        <!-- TextAsset インライン要素 (text-speech, z_index=10) -->
        <g opacity="1.0">
            <text x="400" y="200" font-family="Noto Sans JP" font-size="18" 
                  stroke="#000000" fill="#FFFFFF" stroke-width="2" writing-mode="vertical-rl">
                <tspan x="400" y="200">は</tspan>
                <tspan x="400" dy="26">い</tspan>
                <tspan x="400" dy="26">、</tspan>
                <!-- 以下省略 -->
            </text>
        </g>
    </g>

    <!-- ページ3の描画内容 (z_index順: effect=0, character=1, title=5) -->
    <g id="page-3" style="display: none;">
        <use href="#img-effect" transform="scale(2.0,2.0)" opacity="0.5" />
        <use href="#img-character-a" transform="translate(284,262) scale(1.5,1.5)" opacity="1.0" />
        <!-- TextAsset インライン要素 (text-title, z_index=5) -->
        <g opacity="1.0">
            <text x="384" y="100" font-family="Custom Font Bold" font-size="32" 
                  stroke="#000000" fill="#FF0000" stroke-width="3">
                <tspan x="384" y="100">終わり</tspan>
            </text>
        </g>
    </g>
</svg>
```

## 構造の特徴

### 1. アセット効率化
- **単一定義**: 全プロジェクトで使用される ImageAsset は `<g id="assets">` 内に一度だけ定義
- **重複排除**: 同じ画像が複数ページで使用されても、base64データは1回だけ埋め込み
- **容量削減**: プロジェクト規模に関わらず、各アセットは単一の定義のみ

### 2. ページ管理
- **ページコンテナ**: 各ページは `<g id="page-{番号}>` でグループ化
- **表示制御**: CSS の `display` プロパティで表示/非表示を制御
- **JavaScript切り替え**: 動的にページを切り替え可能

### 3. 柔軟な配置とレイヤー管理
- **Transform対応**: `use` 要素で位置、スケール、回転を個別調整
- **Opacity制御**: ページごとに異なる透明度設定
- **z_index順序**: Asset-level default_z_index と Instance-level override_z_index による柔軟なレイヤー順序管理
- **インライン要素**: TextAsset は直接 SVG 要素として埋め込み

## JavaScript ページ切り替え

HTMLエクスポート時は、以下のようなJavaScriptでページの表示/非表示を制御する：

```javascript
// ページ切り替え関数
function showPage(pageNumber) {
    // 全ページを非表示
    const allPages = document.querySelectorAll('[id^="page-"]');
    allPages.forEach(page => {
        page.style.display = 'none';
    });
    
    // 指定されたページを表示
    const targetPage = document.getElementById(`page-${pageNumber}`);
    if (targetPage) {
        targetPage.style.display = 'block';
    }
}

// 初期化：最初のページを表示
document.addEventListener('DOMContentLoaded', () => {
    showPage(1);
});
```

## プレビューWindow での利用

アプリケーション起動中のPreview Windowでは、実際のOS上ファイルを参照するため、パスを直接指定。
より具体的には、独自プロトコル `komae-asset://` を使用して、アセットのパスを指定する。

```html
<g id="background" opacity="1">
    <image id="image-background" xlink:href="komae-asset:///path/to/file/background.png" 
           width="768" height="1024" x="0" y="0" clip-path="url(#mask-id-circle)" />
</g>
```

## TextAsset の表現

TextAssetは直接インライン要素として各ページグループ内に配置される。多言語対応のため、各テキスト要素には言語別クラス（`lang-{languageCode}`）が付与される：

### 多言語対応テキストの例
```html
<g id="page-1" style="display: block;">
    <use href="#background" />
    <!-- 多言語TextAsset：日本語版 -->
    <g class="lang-ja" opacity="1.0">
        <text x="100" y="150" font-family="Noto Sans CJK JP" font-size="24" 
              stroke="#000000" fill="#000000" stroke-width="1">
            <tspan x="100" y="150">こんにちは</tspan>
            <tspan x="100" dy="28">世界！</tspan>
        </text>
    </g>
    
    <!-- 多言語TextAsset：英語版 -->
    <g class="lang-en" opacity="1.0" style="display: none;">
        <text x="100" y="150" font-family="Arial" font-size="24" 
              stroke="#000000" fill="#000000" stroke-width="1">
            <tspan x="100" y="150">Hello</tspan>
            <tspan x="100" dy="28">World!</tspan>
        </text>
    </g>
    
    <!-- 多言語TextAsset：中国語版 -->
    <g class="lang-zh" opacity="1.0" style="display: none;">
        <text x="100" y="150" font-family="Noto Sans CJK SC" font-size="24" 
              stroke="#000000" fill="#000000" stroke-width="1">
            <tspan x="100" y="150">你好</tspan>
            <tspan x="100" dy="28">世界！</tspan>
        </text>
    </g>
</g>
```

### 縦書きテキストの多言語対応例  
```html
<g id="page-2" style="display: none;">
    <use href="#character1" />
    <!-- 縦書きTextAsset：日本語版（複数行対応） -->
    <g class="lang-ja" opacity="1.0">
        <text x="400" y="100" font-family="Noto Sans CJK JP" font-size="24" 
              writing-mode="vertical-rl" stroke="#333333" fill="#333333">
            <!-- 1行目：右から左へ -->
            <tspan x="400" y="100">第</tspan>
            <tspan x="400" dy="28">一</tspan>
            <tspan x="400" dy="28">行</tspan>
            <!-- 2行目：左側に配置 -->
            <tspan x="376" y="100">第</tspan>
            <tspan x="376" dy="28">二</tspan>
            <tspan x="376" dy="28">行</tspan>
        </text>
    </g>
    
    <!-- 縦書きTextAsset：英語版（横書きに変換） -->
    <g class="lang-en" opacity="1.0" style="display: none;">
        <text x="350" y="120" font-family="Arial" font-size="24" 
              stroke="#333333" fill="#333333">
            <tspan x="350" y="120">First Line</tspan>
            <tspan x="350" dy="28">Second Line</tspan>
        </text>
    </g>
</g>
```

## VectorAsset の表現

VectorAssetは、SVGファイルをアセットとして管理し、各ページでインライン要素として直接描画される。ImageAssetとは異なり、VectorAssetは再利用可能な定義を作成せず、インスタンスごとに個別のSVG要素として配置される。これにより、サイズや位置の変形を柔軟に適用できる。

### VectorAssetの基本構造

```html
<g id="page-1" style="display: block;">
    <use href="#background" />
    
    <!-- VectorAsset インライン要素（vector-icon-heart, z_index=5） -->
    <g id="vector-instance-vec-inst-001">
        <svg x="200" y="150" width="64" height="64" opacity="0.8" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#ff4444"/>
        </svg>
    </g>
    
    <!-- VectorAsset インライン要素（vector-arrow-right, z_index=10） -->
    <g id="vector-instance-vec-inst-002">
        <svg x="400" y="300" width="32" height="32" opacity="1.0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="#333333"/>
        </svg>
    </g>
</g>
```

### VectorAssetの特徴

#### 1. インライン配置
- **直接埋め込み**: VectorAssetは各ページグループ内に直接SVG要素として配置
- **個別変形**: インスタンスごとに位置、サイズ、透明度を個別に設定
- **元SVG保持**: オリジナルのSVGコンテンツ（viewBox、path、fillなど）をそのまま保持

#### 2. 位置とサイズの制御
```html
<!-- アセットのデフォルト値: default_pos_x=100, default_pos_y=100, default_width=48, default_height=48 -->
<!-- インスタンスのオーバーライド: override_pos_x=200, override_width=64, override_height=64 -->
<g id="vector-instance-vec-inst-003">
    <svg x="200" y="100" width="64" height="64" opacity="1.0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <!-- 元のSVGコンテンツ -->
        <circle cx="12" cy="12" r="10" fill="#4CAF50"/>
        <path d="M9 12l2 2 4-4" stroke="#fff" stroke-width="2" fill="none"/>
    </svg>
</g>
```

#### 3. Z-Index順序管理
```html
<g id="page-2" style="display: none;">
    <!-- z_index=1: 背景画像 -->
    <use href="#background" />
    
    <!-- z_index=5: VectorAsset（装飾） -->
    <g id="vector-instance-decoration-001">
        <svg x="50" y="50" width="100" height="100" opacity="0.3" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" fill="url(#gradient1)"/>
        </svg>
    </g>
    
    <!-- z_index=10: キャラクター画像 -->
    <use href="#character1" transform="translate(200,200)" />
    
    <!-- z_index=15: VectorAsset（UIアイコン） -->
    <g id="vector-instance-button-001">
        <svg x="600" y="50" width="48" height="48" opacity="1.0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="#2196F3"/>
        </svg>
    </g>
</g>
```

### VectorAsset vs ImageAssetの違い

| 特徴 | ImageAsset | VectorAsset |
|------|------------|-------------|
| **定義方法** | `<g id="assets">` 内で一度定義 | 各インスタンスでインライン配置 |
| **再利用** | `<use href="#id">` で参照 | 毎回完全なSVG要素を生成 |
| **変形方法** | `transform` 属性で変形 | `x`, `y`, `width`, `height` 属性で直接指定 |
| **ファイル形式** | PNG, JPEG, WebP等のラスター画像 | SVGベクター画像 |
| **スケーラビリティ** | 拡大時に画質劣化 | 無限拡大可能 |
| **カスタマイズ** | 透明度・変形のみ | SVG属性の完全制御 |

### プレビューWindowでの表示

アプリケーション内のプレビューでは、VectorAssetのSVGコンテンツを直接レンダリング：

```html
<!-- レンダラープロセスでの表示 -->
<g id="vector-instance-preview-001">
    <svg x="250" y="200" width="80" height="80" opacity="0.9" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#4CAF50"/>
    </svg>
</g>
```

この方式により、VectorAssetは元のSVGの品質とカスタマイズ性を保ちながら、プロジェクト内で柔軟に配置・変形できる仕組みを実現している。
