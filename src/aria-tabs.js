/**
 * AriaTabs
 * @version 1.0.0
 * @license MIT
 */
class AriaTabs {
  // インスタンス管理用レジストリ
  static #instances = new WeakMap();

  /**
   * @param {HTMLElement|string} target - コンテナ要素 または セレクタ文字列
   * @param {Object} options - 設定オプション
   */
  constructor(target, options = {}) {
    // 引数が文字列なら要素を取得、要素ならそのまま保持
    this.container = typeof target === 'string' ? document.querySelector(target) : target;
    
    if (!this.container) {
      console.warn('AriaTabs: ターゲットとなる要素が見つかりません。', target);
      return;
    }

    // セレクタの自動決定：文字列が渡されていればそれを、なければデフォルトを採用
    // これにより「containerSelector」を別途指定する手間を省く
    const defaultSelector = typeof target === 'string' ? target : '.js-tab-container';

    this.options = {
      containerSelector: defaultSelector,
      paramName: 'tab',
      toggleMethod: 'hidden', // 'hidden' または 'aria-hidden'
      updateUrl: false,
      onTabChange: null,
      ...options
    };

    // 内部要素の抽出
    this.tabs = this._getOwnElements('[role="tab"]');
    this.panels = this._getOwnElements('[role="tabpanel"]');
    this._onTabClickBound = this._handleTabClick.bind(this);
    this.tabList = null;

    AriaTabs.#instances.set(this.container, this);
    this._init();
  }

  /**
   * [Static] ページ内のタブを一括セットアップ
   * @param {string} selector - コンテナのセレクタ
   * @param {Object} options - 設定オプション
   * @returns {Array & {switchTo: Function, activate: Function, getInstance: Function, destroy: Function}}
   */
  static setup(selector = '.js-tab-container', options = {}) {
    const containers = document.querySelectorAll(selector);
    // selectorをcontainerSelectorとして各インスタンスに強制同期させる
    const instances = Array.from(containers).map(el => new AriaTabs(el, { ...options, containerSelector: selector }));

    /** 配列に対する一括操作メソッドの拡張 */
    instances.switchTo = function(tabId) { AriaTabs.switchTo(tabId); return this; };
    instances.activate = function(tabId, opts = {}) { this.forEach(i => i.activate(tabId, opts)); return this; };
    instances.getInstance = function(idOrEl) { return AriaTabs.getInstance(idOrEl); };
    instances.destroy = function() { this.forEach(i => i.destroy()); this.length = 0; };

    return instances;
  }

  /**
   * [Static] IDを指定してタブを切り替える（インスタンスを自動特定）
   */
  static switchTo(tabId) {
    const instance = this.getInstance(tabId);
    if (instance) instance.activate(tabId);
  }

  /**
   * [Static] IDまたはDOM要素からインスタンスを取得
   */
  static getInstance(idOrEl) {
    if (typeof idOrEl === 'string') {
      const tabEl = document.getElementById(idOrEl);
      if (!tabEl) return undefined;
      // role="tablist" の親、または一般的なコンテナクラスを辿る
      const container = tabEl.closest('[role="tablist"]')?.parentElement || tabEl.closest('.js-tab-container');
      return AriaTabs.#instances.get(container);
    }
    return AriaTabs.#instances.get(idOrEl);
  }

  // --- 内部ロジック ---

  /**
   * 自分自身の階層にある要素のみをフィルタリング（ネスト対応の核）
   */
  _getOwnElements(selector) {
    return Array.from(this.container.querySelectorAll(selector)).filter(el => {
      // 自身に最も近いコンテナが自分自身であれば、それは「自分の持ち物」とみなす
      return el.closest(this.options.containerSelector) === this.container;
    });
  }

  /**
   * 初期化：イベント登録と初期表示決定
   */
  _init() {
    if (!this.tabs.length) return;
    this.tabList = Array.from(this.container.querySelectorAll('[role="tablist"]'))
                         .find(el => el.closest(this.options.containerSelector) === this.container);
    this.tabList?.addEventListener('click', this._onTabClickBound);
    this.activate(this._getInitialTabId(), { silent: true });
  }

  /**
   * タブクリック時のハンドラ
   */
  _handleTabClick(e) {
    const clickedTab = e.target.closest('[role="tab"]');
    if (clickedTab && this.tabs.includes(clickedTab)) {
      e.stopPropagation();
      this.activate(clickedTab.id);
    }
  }

  /**
   * アクティブ化処理（UI更新、URL同期、コールバック）
   */
  activate(tabId, { silent = false } = {}) {
    const targetTab = this.tabs.find(tab => tab.id === tabId) || this.tabs[0];
    if (!targetTab) return;
    
    const targetPanelId = targetTab.getAttribute('aria-controls');

    this.tabs.forEach(tab => {
      const isSelected = tab === targetTab;
      tab.setAttribute('aria-selected', String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
    });

    this.panels.forEach(panel => {
      const isVisible = panel.id === targetPanelId;
      this._togglePanel(panel, isVisible);
    });

    if (!silent && this.options.updateUrl) this._reflectUrl(targetTab.id);
    if (!silent && typeof this.options.onTabChange === 'function') this.options.onTabChange(targetTab);
  }

  /**
   * URLパラメータを現在の状態に書き換える（履歴上書き）
   */
  _reflectUrl(tabId) {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const otherInstanceParams = params.getAll(this.options.paramName).filter(id => !this.tabs.some(t => t.id === id));
    
    params.delete(this.options.paramName);
    otherInstanceParams.forEach(id => params.append(this.options.paramName, id));
    params.append(this.options.paramName, tabId);

    window.history.replaceState(null, '', url.toString());
  }

  /**
   * パネルの表示・非表示を切り替え
   */
  _togglePanel(panel, isVisible) {
    if (this.options.toggleMethod === 'aria-hidden') {
      panel.setAttribute('aria-hidden', String(!isVisible));
      panel.removeAttribute('hidden');
    } else {
      panel.hidden = !isVisible;
      panel.removeAttribute('aria-hidden');
    }
  }

  /**
   * 初期表示すべきIDを決定（パラメータ > 属性 > 1番目）
   */
  _getInitialTabId() {
    const params = new URLSearchParams(window.location.search);
    const urlIds = params.getAll(this.options.paramName); 
    const matchedTab = this.tabs.find(t => urlIds.includes(t.id));
    if (matchedTab) return matchedTab.id;
    const selectedTab = this.tabs.find(t => t.getAttribute('aria-selected') === 'true');
    return selectedTab ? selectedTab.id : this.tabs[0].id;
  }

  /**
   * インスタンスの破棄
   */
  destroy() {
    if (this.tabList) this.tabList.removeEventListener('click', this._onTabClickBound);
    AriaTabs.#instances.delete(this.container);
    this.container = null;
    this.tabs = [];
    this.panels = [];
  }
}