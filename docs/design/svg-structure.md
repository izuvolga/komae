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
