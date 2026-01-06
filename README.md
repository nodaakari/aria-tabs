# aria-tabs.js

WAI-ARIA仕様に準拠した、アクセシブルなタブコンポーネントを実装するための軽量なJavaScriptライブラリです。

**特徴**
- **アクセシビリティ**: WAI-ARIAの仕様（`role`, `aria-selected`, `aria-controls`等）に沿った属性管理を自動で行います。
- **ネスト対応**: タブコンポーネントを入れ子にしても、各階層がイベントの伝播を制御し、完全に独立して動作します。
- **高度なURL連携**: URLのクエリパラメータを読み取って初期タブを表示します。複数のタブコンポーネントが同じパラメータ名を共有していても、それぞれの状態を正しく解決・反映できます。
- **便利なAPI**: `setup`メソッドでページ内の全タブを一括初期化したり、`switchTo`メソッドでインスタンスを意識せずにタブを切り替えたりできます。

---

## HTML構造

基本的なHTML構造は、WAI-ARIAの仕様に沿って記述します。

- タブのリスト全体を `role="tablist"` を持つ要素で囲みます。
- 各タブ要素に `role="tab"` と `id` を指定し、対応するパネルのIDを `aria-controls` 属性に指定します。
- 各パネル要素に `role="tabpanel"` と `id` を指定します。
- これら全体を囲むコンテナ要素に、JavaScriptが初期化の起点として使用するクラス（例: `.js-tab-container`）を付与します。

```html
<div class="js-tab-container">
  <div role="tablist">
    <button role="tab" id="tab-1" aria-controls="panel-1" aria-selected="true">タブ 1</button>
    <button role="tab" id="tab-2" aria-controls="panel-2">タブ 2</button>
  </div>
  <div role="tabpanel" id="panel-1">
    <p>パネル 1 のコンテンツです。</p>
  </div>
  <div role="tabpanel" id="panel-2" hidden>
    <p>パネル 2 のコンテンツです。</p>
  </div>
</div>
```

---

## 使い方

### 1. セットアップ

`aria-tabs.js` を読み込み、`AriaTabs.setup()` を呼び出すだけで、対象のタブコンポーネントが初期化されます。

**HTML**
```html
<div class="js-tab-container">
  <!-- タブとパネルのHTML構造 -->
</div>

<script src="./src/aria-tabs.js"></script>
```

**JavaScript**
```javascript
const myTab = AriaTabs.setup();
```
`setup` メソッドは、見つかったすべてのコンテナの `AriaTabs` インスタンスを含む特殊な配列を返します。この配列には、後述する便利なメソッドが追加されています。

### 2. オプションの指定

- `setup` メソッドの第1引数にはCSSセレクタを指定できます。（デフォルト: `.js-tab-container`）
- 第2引数にオプションオブジェクトを渡すことができます。

```javascript
AriaTabs.setup('.my-custom-tabs', {
  updateUrl: true,
  toggleMethod: 'aria-hidden',
  onTabChange: (activatedTab) => {
    console.log(`Activated: ${activatedTab.id}`);
  }
});
```

---

## URLパラメータ連携

ページ読み込み時に特定のタブを開いたり、現在のタブ状態をURLに反映させたりする機能です。

### 初期表示

- **優先順位**: ページロード時、以下の優先順位で表示するタブを決定します。
    1.  URLのクエリパラメータ（例: `?tab=tab-2`）
    2.  HTMLで `aria-selected="true"` が設定されたタブ
    3.  （上記いずれもない場合）最初のタブ
- **複数コンポーネントの共存**: ページ内に複数のタブコンポーネントが存在し、URLパラメータ（例: `?tab=foo&tab=bar`）にそれぞれのタブIDが含まれている場合でも、各コンポーネントが自身のタブIDを認識して正しく初期表示します。

### URLの更新

- **`updateUrl: true`**: このオプションを設定すると、ユーザーがタブを切り替えるたびにURLのクエリパラメータが自動的に更新されます（`history.replaceState`を使用）。
- **パラメータの共存**: この更新処理は非常に洗練されています。ページ内に同じ `paramName` を使う他のタブコンポーネントが存在する場合でも、そのコンポーネントが管理するパラメータを維持したまま、現在のタブ状態のみをURLに反映します。

---

## APIリファレンス

### Options

`setup` または `new AriaTabs()` の際に指定できるオプションです。

| オプション名 | 型 | デフォルト | 説明 |
| :--- | :--- | :--- | :--- |
| `paramName` | `String` | `'tab'` | URLパラメータで使用するキー名です。 |
| `toggleMethod` | `String` | `'hidden'` | 非表示パネルの制御方法を指定します。<br>- `'hidden'`: HTMLの `hidden` 属性を使用します。<br>- `'aria-hidden'`: `aria-hidden="true"` 属性を使用します。この場合、`[aria-hidden="true"] { display: none; }` のようなCSSが別途必要です。 |
| `updateUrl` | `Boolean` | `false` | `true` の場合、タブを切り替えるたびにURLのクエリパラメータを更新します。 |
| `onTabChange` | `Function` | `null` | タブが切り替わるたびに実行されるコールバック関数です。<br>引数として、アクティブになったタブのDOM要素を受け取ります。 |

### 静的メソッド (Static Methods)

| メソッド | 説明 |
| :--- | :--- |
| `AriaTabs.setup(selector, options)` | 指定されたセレクタに一致する全てのコンポーネントを初期化します。返り値は、全インスタンスを含む配列に、後述のCollection APIが追加されたものです。 |
| `AriaTabs.getInstance(elementOrId)` | コンテナ要素またはタブIDから、関連付けられた`AriaTabs`インスタンスを取得します。 |

#### 例

```javascript
AriaTabs.setup('.my-custom-tabs');
```

### インスタンスメソッド (Instance Methods)

`new AriaTabs()` または `AriaTabs.getInstance()` で取得したインスタンスから呼び出せます。

| メソッド | 説明 |
| :--- | :--- |
| `AriaTabs.activate(tabId, options)` | インスタンス内の指定IDのタブをアクティブにします。<br>`{ silent: true }` オプションでURL更新やコールバックを抑制できます。|
| `instance.destroy()` | インスタンスを破棄し、イベントリスナーや内部参照をクリーンアップします。|

#### 例

```javascript
const myInstance = AriaTabs.getInstance('my-tabs-id');

// 'myInstance' を破棄する
myInstance.destroy(); 
```

### Collection API

`AriaTabs.setup()` の返り値に対して使用できる便利なメソッド群です。

| メソッド | 説明 |
| :--- | :--- |
| `collection.switchTo(tabId)` | `AriaTabs.switchTo(tabId)` と同じです。コレクション内のいずれかのインスタンスが持つタブを有効化します。 |
| `collection.activate(tabId, opts)` | コレクション内の**すべてのインスタンス**に対して `activate` メソッドを実行します。 |
| `collection.getInstance(idOrEl)` | `AriaTabs.getInstance(idOrEl)` と同じです。 |
| `collection.destroy()` | コレクション内の**すべてのインスタンス**を破棄します。 |

#### 例

```javascript
const tabCollections = AriaTabs.setup();

// 'tab-2' というIDを持つタブをアクティブにする
tabCollections.switchTo('tab-2');

// 'tabCollections' を破棄する
tabCollections.destroy(); 
```

---

## Examples

### 入れ子（ネスト）の例

親タブの中に、さらに子タブを配置する構造です。それぞれのタブコンテナが独立して動作します。

```html
<div class="js-tab-container">
  <!-- 親タブ -->
  <div role="tablist">
    <button role="tab" id="parent-tab1" aria-controls="parent-panel1">親タブ1</button>
    <button role="tab" id="parent-tab2" aria-controls="parent-panel2">親タブ2</button>
  </div>

  <!-- 親パネル1 -->
  <div role="tabpanel" id="parent-panel1">
    <p>親パネル1のコンテンツ。</p>
    
    <!-- 子タブコンテナ -->
    <div class="js-tab-container">
      <div role="tablist">
        <button role="tab" id="child-tab1" aria-controls="child-panel1">子タブ1</button>
        <button role="tab" id="child-tab2" aria-controls="child-panel2">子タブ2</button>
      </div>
      <div role="tabpanel" id="child-panel1">子パネル1</div>
      <div role="tabpanel" id="child-panel2" hidden>子パネル2</div>
    </div>
  </div>

  <!-- 親パネル2 -->
  <div role="tabpanel" id="parent-panel2" hidden>
    <p>親パネル2のコンテンツ。</p>
  </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
  AriaTabs.setup(); 
});
</script>
```


### aria-hiddenとアニメーション

`toggleMethod: 'aria-hidden'` を使う場合は、CSSの記述を忘れないようにしてください。

**例**
```CSS
/* aria-hidden="true" のパネルを物理的に非表示にする */
.my-custom-tabs [role="tabpanel"][aria-hidden="true"] {
  display: none;
}

/* 任意：表示時のアニメーション */
.my-custom-tabs [role="tabpanel"][aria-hidden="false"] {
  display: block;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

---

- このコードの利用は自己責任で行ってください。
- ご利用によるいかなる損害についても、作者は一切の責任を負いません。
