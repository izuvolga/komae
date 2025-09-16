次に ImageEditModalを移行してください。
次に TextEditModalを移行してください。

複数のモーダルでリサイズハンドルを定義していますが、これも src/renderer/components/common/ 配下の部品にできませんかね。

$ pt リサイズハンドル src/renderer/components/asset/
src/renderer/components/asset//VectorEditModal.tsx
357:                  {/* SVGベースのリサイズハンドル */}

src/renderer/components/asset//DynamicVectorEditModal.tsx
687:                  {/* SVGベースのリサイズハンドル */}

src/renderer/components/asset//ImageEditModal.tsx
527:                  {/* SVGベースのリサイズハンドル */}
