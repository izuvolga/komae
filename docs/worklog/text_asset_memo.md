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

現在 TextEditModal では、設定値の更新に２つの関数を使い分けています。

- handleInputChange: getCurrentValue に似ている。値を受け取って TextAsset の直接のプロパティならばアセットを直接編集、そうでなければ状況に応じて Asset/Instance の編集。
- handleCommonSettingsChange: 強制的に editingAsset を編集する関数

両者が混在する状況は保守性が悪いです。
一旦、setCurrentValue を新たに作成してください。
handleInputChange と handleCommonSettingsChange の両方で利用するようにしたいです。
ただし、まだ handleInputChange と handleCommonSettingsChange の置き換えはしないでください。
私が手動で動作確認をします。

      setEditingInstance({
        ...editingInstance,
        multilingual_text: {
          ...editingInstance.multilingual_text,
          [currentLang]: newText
        }
      });
