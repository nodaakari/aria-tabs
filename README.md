# aria-tabs.js

WAI-ARIA仕様に準拠した、アクセシブルなタブコンポーネントを実装するための軽量なJavaScriptライブラリです。

[https://nodaakari.github.io/aria-tabs/](https://nodaakari.github.io/aria-tabs/)

---

## 特徴

### アクセシビリティ

WAI-ARIAの仕様（`role`, `aria-selected`, `aria-controls`等）に沿った属性管理を自動で行います。

### ネスト & 複数ボタン連動に対応

- タブコンポーネントを入れ子にしても、各階層がイベントの伝播を制御し、完全に独立して動作します。
- 同じパネルID（`aria-controls`）を持つボタンすべてを一括で制御できます。

### URLパラメータ連携

- URLのクエリパラメータを読み取って初期タブを表示します。
- タブ切り替えに連動してURLのクエリパラメータを更新できます。

### 便利なAPI

- `setup()`メソッドでページ内の全タブを一括初期化できます。
- EventやCallback機能で柔軟な制御が可能です。

---

## HTML構造

基本的なHTML構造は、WAI-ARIAの仕様に沿って記述します。

- タブのリスト全体を `role="tablist"` を持つ要素で囲みます。
- 各タブ要素に `role="tab"` と `id` を指定し、対応するパネルのIDを `aria-controls` 属性に指定します。
- 各パネル要素に `role="tabpanel"` と `id` を指定します。
- これら全体を囲むコンテナ要素に、JavaScriptが初期化の起点として使用するクラス（デフォルト: `.js-tab-container`）を付与します。

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
  callback: {
    onTabChange: (activatedTab) => {
      console.log(`Activated: ${activatedTab.id}`);
    }
  }
});
```

---

## URLパラメータ連携

ページ読み込み時に特定のタブを開いたり、現在のタブ状態をURLに反映させたりする機能です。（例: `?tab=tab-2`）

### 初期表示の優先順位

ページロード時、以下の優先順位で表示するタブを決定します。

1.  URLのクエリパラメータ
2.  HTMLで `aria-selected="true"` が設定されたタブ
3.  （上記いずれもない場合）最初のタブ

**複数コンポーネントの共存**: ページ内に複数のタブコンポーネントが存在し、URLパラメータにそれぞれのタブIDが含まれている場合でも、各コンポーネントが自身のタブIDを認識して正しく初期表示します。

例: `https://example.com/?tab=foo&tab=bar`

### URLの更新

- **`updateUrl: true`**: このオプションを設定すると、ユーザーがタブを切り替えるたびにURLのクエリパラメータが自動的に更新されます。

---

## APIリファレンス

### Options

`setup()` または `new AriaTabs()` の際に指定できるオプションです。

| オプション名 | 型 | デフォルト | 説明 |
| :--- | :--- | :--- | :--- |
| `paramName` | `String` | `'tab'` | URLパラメータで使用するキー名です。 |
| `toggleMethod` | `String` | `'hidden'` | 非表示パネルの制御方法を指定します。<br>- `'hidden'`: HTMLの `hidden` 属性を使用します。<br>- `'aria-hidden'`: `aria-hidden="true"` 属性を使用します。 |
| `updateUrl` | `Boolean` | `false` | `true` の場合、タブを切り替えるたびにURLのクエリパラメータを更新します。 |
| `callback` | `Object` | `{}` | コールバック関数を格納するオブジェクトです。詳細は`Callback`セクションを参照してください。 |

### Callback

`options.callback` オブジェクトに設定できるコールバック関数です。

| プロパティ名 | 引数 | 説明 |
| :--- | :--- | :--- |
| `onInit` | `(instance)` | インスタンスの初期化が完了したときに実行されます。 |
| `onTabChange` | `(activatedTab, instance)` | タブが切り替わったときに実行されます。 |

### Event

`on()` メソッドを使用して、特定のイベントを購読できます。インスタンスごと、またはグローバルに登録できます。

| イベント名 | 引数 | 説明 |
| :--- | :--- | :--- |
| `init` | `(instance)` | インスタンスの初期化が完了したときに発火します。 |
| `tabChange` | `(activatedTab, instance)` | タブが切り替わったときに発火します。 |

#### グローバルイベント

```javascript
// すべてのインスタンスでタブが切り替わるたびに実行
AriaTabs.on('tabChange', (activatedTab, instance) => {
  console.log(`Tab changed in ${instance.container.id}:`, activatedTab.id);
});

AriaTabs.setup();
```

#### インスタンスごとのイベント

```javascript
const collection = AriaTabs.setup();

// 特定のインスタンスに対してイベントを登録
const instance = collection[0];
instance.on('tabChange', (tab) => console.log('First instance tab changed to:', tab.id));

// setup()が返すコレクションに対しても一括で登録可能
collection.on('init', (instance) => console.log(instance.container.id, 'initialized.'));
```

- **注意**: `init` イベントは `setup()` より前に書く必要があります。`setup()` が終わった時にはすでに初期化が終了しているためイベントは実行されません。


### 静的メソッド (Static Methods)

| メソッド | 説明 |
| :--- | :--- |
| `AriaTabs.setup(selector, options)` | 指定されたセレクタに一致する全てのコンポーネントを初期化します。返り値は、全インスタンスを含む配列に、後述のCollection APIが追加されたものです。 |
| `AriaTabs.switchTo(tabId)` | いずれかのインスタンスに属するタブIDを指定して、そのタブをアクティブにします。対象インスタンスは自動で特定されます。 |
| `AriaTabs.getInstance(idOrEl)` | コンテナ要素またはタブIDなどの子孫要素から、関連付けられた`AriaTabs`インスタンスを取得します。 |
| `AriaTabs.on(event, callback)` | グローバルなイベントリスナーを登録します。 |

### インスタンスメソッド (Instance Methods)

`new AriaTabs()` または `AriaTabs.getInstance()` で取得したインスタンスから呼び出せます。 (個別操作)

| メソッド | 説明 |
| :--- | :--- |
| `instance.activate(tabId, options)` | インスタンス内の指定IDのタブをアクティブにします。<br>`{ silent: true }` オプションを渡すと、URL更新や `tabChange` イベントの発火を抑制できます。|
| `instance.destroy()` | インスタンスを破棄し、イベントリスナーや内部参照をクリーンアップします。|
| `instance.on(event, callback)` | インスタンス固有のイベントリスナーを登録します。 |

### Collection API

`AriaTabs.setup()` の返り値（インスタンスの配列）に対して使用できる便利なメソッド群です。 (一括操作)

| メソッド | 説明 |
| :--- | :--- |
| `collection.on(event, callback)` | コレクション内の**すべてのインスタンス**にイベントリスナーを一括で登録します。 |
| `collection.switchTo(tabId)` | `AriaTabs.switchTo(tabId)` と同じです。いずれかのインスタンスが持つタブを有効化します。 |
| `collection.getInstance(idOrEl)` | `AriaTabs.getInstance(idOrEl)` と同じです。 |
| `collection.destroy()` | コレクション内の**すべてのインスタンス**を破棄します。 |

#### 例

```javascript
const tabCollection = AriaTabs.setup();

// 'tab-2' というIDを持つタブをアクティブにする
tabCollection.switchTo('tab-2');

// すべてのインスタンスが破棄される
tabCollection.destroy(); 
```

---

## aria-hidden

`toggleMethod: 'aria-hidden'` を使う場合は、CSSの記述を忘れないようにしてください。

**例**
```css
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

### 上下にあるタブが連動する例

```html
<div class="js-tab-container">
  <div role="tablist">
    <button id="tab-1-top" role="tab" aria-controls="panel-1" aria-selected="true">地域から探す</button>
    <button id="tab-2-top" role="tab" aria-controls="panel-2">条件から探す</button>
  </div>

  <div id="panel-1" role="tabpanel">地域パネルの内容</div>
  <div id="panel-2" role="tabpanel" hidden>条件パネルの内容</div>

  <div role="tablist">
    <button id="tab-1-bottom" role="tab" aria-controls="panel-1">地域から探す</button>
    <button id="tab-2-bottom" role="tab" aria-controls="panel-2">条件から探す</button>
  </div>
</div>
```

---

- このコードの利用は自己責任で行ってください。
- ご利用によるいかなる損害についても、作者は一切の責任を負いません。
