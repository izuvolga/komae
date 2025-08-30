CustomAssetManager.ts -- カスタムアセット管理、IPC通信の後で呼ばれるモジュールで、画面ではない
CustomAssetManagementModal.ts -- 新規アセット追加画面
CustomAssetSelectionModal.ts -- 新規アセット選択画面

---

./src/main/main.ts
```
    ipcMain.handle('customAsset:addAsset', async (event, filePath: string) => {
      try {
        return await this.customAssetManager.addCustomAsset(filePath);
      } catch (error) {
        console.error('Failed to add custom asset:', error);
        throw error;
      }
    });
```

IPC通信でカスタムアセットを読み込めるようにしている。
CustomAssetManager.ts -- サービスプロセス

./src/main/services/CustomAssetManager.ts
```
175:  async addCustomAsset(sourceFilePath: string): Promise<CustomAssetInfo> {
...
      // ファイルの内容を読み込みとメタデータ解析
      const fileContent = fs.readFileSync(sourceFilePath, 'utf-8');
      const parsedAsset = parseCustomAsset(fileContent);
```
=> ファイルの読み込み

customAssetParser.ts

```
export function parseCustomAsset(fileContent: string): ParsedCustomAsset {
...

function parseMetadataBlock(metadataBlock: string): CustomAssetMetadata {
  const lines = metadataBlock.split('\n').map(line => line.trim());
  
  const metadata: Partial<CustomAssetMetadata> = {
    parameters: []
  };

  for (const line of lines) {
    if (line.startsWith('// @name')) {
      metadata.name = extractValue(line);
    } else if (line.startsWith('// @type')) {
      metadata.type = extractValue(line);
    } else if (line.startsWith('// @version')) {
      metadata.version = extractValue(line);
    } else if (line.startsWith('// @author')) {
      metadata.author = extractValue(line);
    } else if (line.startsWith('// @description')) {
      metadata.description = extractValue(line);
    } else if (line.startsWith('// @parameters')) {
      metadata.parameters = parseParameters(extractValue(line));
    }
  }
```

```
  async generateCustomAssetSVG(assetId: string, parameters: Record<string, any>): Promise<string> {
  //...
      // コードを実行してSVGを生成
      const vm = require('vm');
      const context = vm.createContext(sandbox);

      // コードを実行し、結果を取得
      let result: string;
      try {
        result = vm.runInContext(`
          (function() {
            ${parsedAsset.code}
            // generateSVG関数が定義されていることを想定
            if (typeof generateSVG === 'function') {
              return generateSVG();
            } else {
              throw new Error('generateSVG function not found in custom asset code');
            }
          })()
        `, context, { timeout: 5000 });
      } catch (executionError) {
        throw new Error(`Failed to execute custom asset code: ${executionError instanceof Error ? executionError.message : String(executionError)}`);
      }
  //...
}
```

どうも、ここで CustomAssetInfo というクラスで CustomAsset を管理している。

-------------


CustomAssetSelectionModal.ts の処理を追って、どこから DynamicVectorAsset が作られているかを確認する。

```
            <button
              className="custom-asset-selection-confirm"
              onClick={handleConfirm}
              disabled={isLoading || !selectedAssetId}
            >
              このCustomAssetでDynamic SVGを作成
            </button>
```


```
const CustomAssetSelectionModal: React.FC<CustomAssetSelectionModalProps> = ({
//...
  const handleConfirm = () => {
    if (selectedAssetId) {
      const selectedAsset = customAssets.find(a => a.id === selectedAssetId);
      if (selectedAsset) {
        onSelect(selectedAsset);
      }
    }
  };
//...
})
```

React の勉強中です、質問です。
@src/renderer/components/asset/CustomAssetSelectionModal.tsx
以下のボタンを押下したときの処理を教えてください。

```
            <button
              className="custom-asset-selection-confirm"
              onClick={handleConfirm}
              disabled={isLoading || !selectedAssetId}
            >
              このCustomAssetでDynamic SVGを作成
            </button>
```

特に、以下のモーダルが実際に開くのですが、どのような流れで開いているのかを教えてください。

@src/renderer/components/asset/DynamicVectorEditModal.tsx

handleConfirm関数を見たのですが、以下の処理だけで、なぜ上記モーダルが開くのかがわかりません。

```
  const handleConfirm = () => {
    if (selectedAssetId) {
      const selectedAsset = customAssets.find(a => a.id === selectedAssetId);
      if (selectedAsset) {
        onSelect(selectedAsset);
      }
    }
  };

```


------------------

  データフロー全体の仕組み

  1. ボタン押下時の処理（CustomAssetSelectionModal.tsx:195-200）
  const handleConfirm = () => {
    if (selectedAssetId) {
      const selectedAsset = customAssets.find(a => a.id === selectedAssetId);
      if (selectedAsset) {
        onSelect(selectedAsset);  // ← ここがポイント！
      }
    }
  };

  2. onSelectプロパティの実体（AssetLibrary.tsx:807）
  <CustomAssetSelectionModal
    isOpen={showCustomAssetSelectionModal}
    onClose={handleCustomAssetSelectionModalClose}
    onSelect={handleCustomAssetSelect}  // ← これが渡されている
  />

  3. handleCustomAssetSelectの処理（AssetLibrary.tsx:319-350）
  const handleCustomAssetSelect = async (customAssetInfo: any) => {
    // CustomAssetベースのDynamicVectorAssetを作成
    const result = createDynamicVectorAsset({...});
    addAsset(result);
    setShowCustomAssetSelectionModal(false);

    // 作成後すぐに編集モードで開く ← ここで開いている！
    setEditingDynamicVectorAsset(result);
  };

  4. editingDynamicVectorAssetがセットされると（AssetLibrary.tsx:782-786）
  {editingDynamicVectorAsset && (
    <DynamicVectorEditModal
      mode="asset"
      asset={editingDynamicVectorAsset}
      isOpen={!!editingDynamicVectorAsset}  // ← nullでなければtrue = モーダル表示
      ...
    />
  )}

  つまり、流れは：

  1. ボタン押下 → handleConfirm()
  2. onSelectコールバック実行 → handleCustomAssetSelect()
  3. DynamicVectorAsset作成 → createDynamicVectorAsset()
  4. 状態更新 → setEditingDynamicVectorAsset(result)
  5. モーダル表示 → editingDynamicVectorAssetがnullでなくなったのでDynamicVectorEditModalが条
  件付きレンダリングされる

  Reactの重要なポイント：
  - onSelectは**コールバック関数（props）**として渡されている
  - 子コンポーネント（CustomAssetSelectionModal）が親コンポーネント（AssetLibrary）の関数を呼
  び出している
  - 親コンポーネントで状態（editingDynamicVectorAsset）が変更されると、条件付きレンダリングで
  モーダルが表示される

  これがReactの単方向データフローとコールバックパターンの典型例です！
