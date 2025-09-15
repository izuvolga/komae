優先度

asset.name (BaseAsset なので関係ない)
asset.default_text > instance.multilingual_text
asset.default_context > instance.override_context
asset.default_settings > asset.default_language_override > instance.override_language_settings

例えば、font  は LanguageSettings に入っているので、以下が利用される。

asset.default_settings > asset.default_language_override > instance.override_language_settings

で、現在 TextAsset で利用しているのは

```
  // フォント関連のヘルパー関数
  const getCurrentFont = () => {
    if (mode === 'instance' && editingInstance) {
      const currentLang = getCurrentLanguage();
      const langSettings = editingInstance.override_language_settings?.[currentLang];
      return getEffectiveFont(editingAsset, editingInstance, currentLang);
    }
    return getEffectiveFont(editingAsset, null, getCurrentLanguage());
  };

  const updateFont = (value: string) => {
    if (mode === 'asset') {
      // Font is now handled through language settings
      const currentLang = getCurrentLanguage();
      handleLanguageSettingChange(currentLang, 'font', value);
    } else {
      handleInstanceLanguageSettingChange(getCurrentLanguage(), 'font', value);
    }
  };

```

と、それぞれの項目を取得・更新している。
まず、4象限の概念で考える

取得: 最も優先されるものを取得
更新: 最も優先されるものを更新
取得: 狙ったものを取得
更新: 狙ったものを更新

このうち取得系の 2 つを一気に担うのが

getEffectiveLanguageSetting

関数で、phaseで優先度を AUTO にすれば最も優先されるものが、それ以外ならば特定のレイヤで取得できる。

逆に、更新を担うのが handleCommonSettingChange と handleLanguageOverrideChange で、呼び出される箇所それぞれで if 文で書き換えている

取得: 最も優先されるものを取得 --  getEffectiveLanguageSetting
更新: 最も優先されるものを更新 -- handleCommonSettingChange/handleLanguageOverrideChange
取得: 狙ったものを取得 -- getEffectiveLanguageSetting
更新: 狙ったものを更新 --  handleCommonSettingChange/handleLanguageOverrideChange

さらに、text と contextもある

text 取得 getCurrentTextValue
text 更新 updateTextValue
context 取得 直接 asset.default_context 取得 (instance は editingInstance?.override_context も使う)
context 更新 handleInputChange (instance は setEditingInstance を使う)


かなりカオスな状況だな。。
以下のパターンそれぞれで考える必要がありそうだ。

取得 asset/instance
更新 asset/instance
text取得 asset/instance
text更新 asset/instance
context取得 asset/instance
context更新 asset/instance

■■■■■■■■■■■■■■■■■■■■

■ 1-phase priority: asset.name
name
  get: getCurrentValue('name')
  set: setCurrentValue('name', e.target.value)

■ 2-phase priority: asset.default_text -> instance.multilingual_text
default_text
  get: getCurrentValue('text')
  set: setCurrentValue('text', e.target.value)

■ 2-phase priority: asset.default_context -> instance.override_context
default_context
  get: getCurrentValue('context')
  set: setCurrentValue('context', e.target.value)

■ 3-phase priority : asset -> asset.lang -> instance
pos_x
  get: getCurrentPosition
  set: handleCommonSettingChange('pos_x', value)
pos_y
  get: getCurrentPosition
  set: handleCommonSettingChange('pos_y', value)
font
  get: getCurrentValue('font')
  set: handleCommonSettingsChange({ font: e.target.value })
font_size
  get: getCurrentValue('font_size')
  set: handleCommonSettingsChange
leading
  get: getCurrentValue('leading')
  set: handleCommonSettingsChange({ leading: value })
vertical
  get: getCurrentValue('vertical')
  set: handleCommonSettingsChange({ vertical: value })
opacity
  get: getCurrentValue('opacity')
  set: setCurrentValue('opacity', value)
z_index
  get: getCurrentValue('z_index')
  set: setCurrentValue('z_index', value)
fill_color
  get: getCurrentValue('fill_color') 
  set: setCurrentValue('fill_color', color)
stroke_color
  get: getCurrentValue('stroke_color')
  set: setCurrentValue('stroke_color', color)
stroke_width
  get: getCurrentValue('stroke_width')
  set: setCurrentValue('stroke_width', value)

■■■■■■■■■■■■■■■■■■■■

TextEditModal で TextAsset を編集しているときに編集できる項目を一つ増やしてください。
「テキスト」（default_text）に、さらに「各ページの初期値に上記テキストを使う」のチェックボックスを追加してください。

- boolean 型の use_default_text_for_pages というフィールドを TextAsset に追加してください。
- TextEditModal で asset.default_text の編集項目の下にチェックボックスを追加してください。

■■■■■■■■■■■■■■■■■■■■

そうですね。まずは修正方針を考えましょう。
以下のようになる理解です。

```
export interface TextAsset extends BaseAsset {
  type: 'TextAsset';

  default_text: string;                                    // 全言語共通のフォールバック
  default_context?: string;
  enable_default_text?: boolean;                          // デフォルトテキスト機能の有効/無効
  default_text_override?: Record<string, string>;         // 言語ごとのデフォルトテキスト（新機能）
  default_settings: LanguageSettings;
  default_language_override?: Record<string, LanguageSettings>;
}
```


これは、 TextAsset の enable_default_text を、さらに言語ごとに上書きできるようにするためのものです。
例えば日本語を言語として設定しているプロジェクトにおいて

TextAssetInstance.multilingual_text['ja'] に何らかの値が入っている場合、当然それを使います。
しかし、もし空の場合、以下の条件でそのインスタンスの初期テキストを使う動作となるかと思います。

パターン1. TextAssetInstance.default_text_override['ja'] が設定されており、なおかつ asset.enable_default_text が true の場合、 default_text_override['ja'] の内容を使う
パターン2. パターン1に該当しない場合、asset.enable_default_text が設定されており enable_default_text が true の場合、asset.default_text を使う

default_text_override['ja'] のように言語ごとにデフォルトテキストを設定できるようにすると思いますが、ここに null ないし undefined は設定できるのでしょうか？
例えば、ja だけは default_text_override['ja'] を設定し、他の言語は asset.default_text を使うようにしたい場合、 default_text_override['en'] = null のようにできると便利かと思います。

■■■■■■■■■■■■■■■■■■■■

default_language_override -> default_settings_lang
default_text_override -> default_text_lang
enable_default_text -> autofill_defaut_text
