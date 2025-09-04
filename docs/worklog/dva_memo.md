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


LLMの回答
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

----------

なるほど。AssetLibrary.tsx 側での以下の処理がポイントだったのか。
このモーダルを呼び出す親コンポーネント側で、onSelectのときに違うモーダルが開くようにしているんですね。

```
      {/* CustomAsset選択モーダル */}
      <CustomAssetSelectionModal
        isOpen={showCustomAssetSelectionModal}
        onClose={handleCustomAssetSelectionModalClose}
        onSelect={handleCustomAssetSelect}
      />
```

----------

CustomAssetManagementModal.ts では以下のようにして、CustomAssetのパラメータ情報を取得している。

```
  // CustomAssetのパラメータ情報を取得（配列として処理）
  const customAssetParameters = asset.customAssetInfo?.parameters || [];
  const hasParameters = Array.isArray(customAssetParameters) && customAssetParameters.length > 0;
```

hasParameters が存在しないと、編集画面がでないらしい。
なんで存在しないんだろう？

createDynamicVectorAsset 関数で作成をしているが customAssetInfo は設定しているようには見える。

```
  async createDynamicVectorAsset(name: string, customAssetId: string): Promise<DynamicVectorAsset> {
    // CustomAssetの詳細情報を取得
    const customAssetInfo = await this.customAssetManager.getCustomAssetInfo(customAssetId);

    if (!customAssetInfo) {
      throw new Error(`CustomAsset with ID "${customAssetId}" not found`);
    }

    // CustomAssetのパラメータをデフォルト値で初期化
    const customAssetParameters: Record<string, number | string> = {};
    if (customAssetInfo.parameters) {
      customAssetInfo.parameters.forEach((param: any) => {
        customAssetParameters[param.name] = param.defaultValue;
      });
    }

    const asset = createDynamicVectorAsset({
      name,
      customAssetId, // DynamicVectorAssetは常にCustomAsset
      customAssetInfo: customAssetInfo,
      customAssetParameters: customAssetParameters,
    });

    // ...

    return asset;
  }
```

ただ、これはあくまで新規作成時だ。
プロジェクトから読み込むときはどうなっているのだろうか。

```
assets:
  dynamic-vector-83a2e3ba-7827-4582-9984-fcfa299f2e50:
    id: dynamic-vector-83a2e3ba-7827-4582-9984-fcfa299f2e50
    # ...
    script: |-
    # ...
    use_page_variables: false
    use_value_variables: false
    customAssetId: circle
    customAssetParameters:
      width: 100
      height: 60
      color: '#ff0000'
    customParameters: {}
    customAssetInfo:
      id: circle
      name: Beautiful Circle
      type: DynamicVector
      version: 1.0.0
      author: Test Author
      description: A beautiful circle with customizable size and color.
      parameters:
        - name: width
          type: number
          defaultValue: 100
        - name: height
          type: number
          defaultValue: 60
        - name: color
          type: string
          defaultValue: '#ff0000'
      filePath: /Users/greymd/Library/Application Support/komae/custom-assets/circle.komae.js
      addedAt: '2025-08-30T13:46:51.631Z'
```

なんだかごちゃごちゃ余計な情報が入っているように見えるな。。
そもそも、filePath 不要だし、customAssetParameters と customParameters が分かれているのも謎。
