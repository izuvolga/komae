# File structure

Project を HTML として出力すると、おおむね以下のようなコードが生成される想定です。

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Komae Story</title>
  <style>
    /* フォントのBase64埋め込み */
    @font-face {
      font-family: 'NotoSansJP';
      src: url(data:font/truetype;charset=utf-8;base64,AAEAAAATAQAAAB...);
    }
    @font-face {
      font-family: 'CustomFont';
      src: url(data:font/truetype;charset=utf-8;base64,AAEAAAATAQAAAB...);
    }
    
    /* ビューワーのスタイル */
    #viewer {
      width: 100vw;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #000;
    }
    
    .page-svg {
      cursor: pointer;
      max-width: 90vw;
      max-height: 90vh;
    }
    
    .page-svg[data-visible="false"] {
      display: none;
    }
  </style>
</head>
<body>
  <script>
    <!-- ビューワーとして動作するための JavaScript コード -->
    let currentPage = 0;
    const totalPages = 3;
    
    function showPage(pageIndex) {
      const pages = document.querySelectorAll('.page-svg');
      pages.forEach((page, index) => {
        page.setAttribute('data-visible', index === pageIndex ? 'true' : 'false');
      });
    }
    
    function nextPage() {
      if (currentPage < totalPages - 1) {
        currentPage++;
        showPage(currentPage);
      }
    }
    
    function prevPage() {
      if (currentPage > 0) {
        currentPage--;
        showPage(currentPage);
      }
    }
    
    // クリック位置で前/次ページを判定
    document.getElementById('viewer').addEventListener('click', (e) => {
      const rect = e.target.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const halfHeight = rect.height / 2;
      
      if (clickY < halfHeight) {
        prevPage();
      } else {
        nextPage();
      }
    });
    
    // 初期表示
    window.onload = () => showPage(0);
  </script>

  <div id="viewer">
    
    <!-- Page 1 -->
    <svg
      class="page-svg"
      data-visible="true"
      width="400"
      viewBox="0 0 768 1024"
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
    >
      <!-- ImageAssetInstance: Background (z-index: 0) -->
      <g transform="translate(0,0) scale(1.0,1.0) rotate(0)" opacity="1.0">
        <image 
          xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          width="768" 
          height="1024" 
          x="0" 
          y="0"
        />
      </g>
      
      <!-- ImageAssetInstance: Character (z-index: 1) -->
      <g transform="translate(200,300) scale(1.2,1.2) rotate(0)" opacity="0.9">
        <defs>
          <clipPath id="mask-char-page1">
            <rect x="10" y="20" width="300" height="400"/>
          </clipPath>
        </defs>
        <image 
          xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          width="320" 
          height="440" 
          x="0" 
          y="0"
          clip-path="url(#mask-char-page1)"
        />
      </g>
      
      <!-- TextAssetInstance: Speech (z-index: 2) -->
      <g transform="translate(150,100) scale(1.0,1.0) rotate(0)" opacity="1.0">
        <text 
          x="0" 
          y="0" 
          font-family="NotoSansJP" 
          font-size="24" 
          fill="#FFFFFF"
          stroke="#000000"
          stroke-width="2"
          writing-mode="tb-rl"
          text-anchor="start"
        >
          <tspan x="0" dy="0">こんにちは！</tspan>
          <tspan x="0" dy="30">お元気ですか？</tspan>
        </text>
      </g>
    </svg>
    
    <!-- Page 2 -->
    <svg
      class="page-svg"
      data-visible="false"
      width="400"
      viewBox="0 0 768 1024"
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
    >
      <!-- ImageAssetInstance: Background (z-index: 0) - 同じ背景を再利用 -->
      <g transform="translate(0,0) scale(1.0,1.0) rotate(0)" opacity="1.0">
        <image 
          xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          width="768" 
          height="1024" 
          x="0" 
          y="0"
        />
      </g>
      
      <!-- ImageAssetInstance: Character (z-index: 1) - 位置とスケールが変更 -->
      <g transform="translate(100,400) scale(0.8,0.8) rotate(-5)" opacity="1.0">
        <image 
          xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          width="320" 
          height="440" 
          x="0" 
          y="0"
        />
      </g>
      
      <!-- TextAssetInstance: Speech (z-index: 2) - 内容とフォントサイズが変更 -->
      <g transform="translate(400,200) scale(1.0,1.0) rotate(0)" opacity="1.0">
        <text 
          x="0" 
          y="0" 
          font-family="NotoSansJP" 
          font-size="20" 
          fill="#000000"
          stroke="#FFFFFF"
          stroke-width="1"
          writing-mode="tb-rl"
          text-anchor="start"
        >
          <tspan x="0" dy="0">はい、元気です！</tspan>
        </text>
      </g>
    </svg>
    
    <!-- Page 3 -->
    <svg
      class="page-svg"
      data-visible="false"
      width="400"
      viewBox="0 0 768 1024"
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
    >
      <!-- ImageAssetInstance: Effect (z-index: 0) -->
      <g transform="translate(0,0) scale(1.0,1.0) rotate(0)" opacity="0.7">
        <image 
          xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          width="768" 
          height="1024" 
          x="0" 
          y="0"
        />
      </g>
      
      <!-- ImageAssetInstance: Character (z-index: 1) -->
      <g transform="translate(300,200) scale(1.5,1.5) rotate(10)" opacity="1.0">
        <image 
          xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          width="320" 
          height="440" 
          x="0" 
          y="0"
        />
      </g>
      
      <!-- TextAssetInstance: Title (z-index: 2) - 横書きテキスト -->
      <g transform="translate(384,100) scale(1.0,1.0) rotate(0)" opacity="1.0">
        <text 
          x="0" 
          y="0" 
          font-family="CustomFont" 
          font-size="32" 
          fill="#FF0000"
          stroke="#000000"
          stroke-width="3"
          text-anchor="middle"
          dominant-baseline="middle"
        >
          終わり
        </text>
      </g>
    </svg>
    
  </div>
</body>
</html>
```

## 設計の特徴

### AssetInstanceベースの構造

各ページは個別の`<svg>`要素として定義され、その中に**AssetInstance**がz_index順で配置されます。

- **ImageAssetInstance**: `<g>`要素内の`<image>`として表現
- **TextAssetInstance**: `<g>`要素内の`<text>`として表現

### Transform属性の適用

各AssetInstanceは`<g>`要素の`transform`属性で以下を制御：

```html
<g transform="translate(x,y) scale(scale_x,scale_y) rotate(angle)">
```

### 個別設定のオーバーライド

- **位置**: `translate(x,y)`
- **スケール**: `scale(scale_x,scale_y)`  
- **回転**: `rotate(angle)`
- **透明度**: `opacity`属性
- **マスク**: `<clipPath>`要素を使用

### TextAssetの表現

- **縦書き**: `writing-mode="tb-rl"`
- **横書き**: デフォルト（`writing-mode`未指定）
- **複数行**: `<tspan>`要素で行分け
- **フォント設定**: `font-family`, `font-size`, `fill`, `stroke`

### Base64埋め込み

- **画像**: `data:image/png;base64,...`
- **フォント**: `data:font/truetype;charset=utf-8;base64,...`

これにより、外部ファイル依存なしの単一HTMLファイルとして出力できます。
