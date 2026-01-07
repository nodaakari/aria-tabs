/**
 * AriaTabs - アクセシビリティ対応タブライブラリ
 * @version 1.0.0
 */
class AriaTabs {
  // インスタンス管理用レジストリ
  static #instances = new WeakMap();
  static #globalListeners = { init: [], tabChange: [] };

  // グローバルイベント登録
  static on(event, callback) {
    if (this.#globalListeners[event]) this.#globalListeners[event].push(callback);
    return this;
  }

  /**
   * @param {HTMLElement|string} target - コンテナ要素 または セレクタ文字列
   * @param {Object} options - 設定オプション
   */
  constructor(target, options = {}) {
    this.container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!this.container) {
      console.warn('AriaTabs: ターゲットとなる要素が見つかりません。', target);
      return;
    }

    const defaultSelector = typeof target === 'string' ? target : '.js-tab-container';

    this.options = {
      containerSelector: defaultSelector,
      paramName: 'tab',
      toggleMethod: 'hidden',
      updateUrl: false,
      ...options,
      callback: {
        onInit: null,
        onTabChange: null,
        ...(options.callback || {})
      }
    };

    this._listeners = { init: [], tabChange: [] };
    this.tabs = this._getOwnElements('[role="tab"]');
    this.panels = this._getOwnElements('[role="tabpanel"]');
    this._onTabClickBound = this._handleTabClick.bind(this);
    this.tabLists = [];

    AriaTabs.#instances.set(this.container, this);
    this._init();
  }

  /**
   * [Static] ページ内のタブを一括セットアップ
   * @param {string} selector - コンテナのセレクタ
   * @param {Object} options - 設定オプション
   */
  static setup(selector = '.js-tab-container', options = {}) {
    const containers = document.querySelectorAll(selector);
    const mergedOptions = { ...options, containerSelector: selector };
    const instances = Array.from(containers).map(el => new AriaTabs(el, mergedOptions));

    instances.on = function(event, callback) { this.forEach(i => i.on(event, callback)); return this; };
    instances.switchTo = function(tabId) { AriaTabs.switchTo(tabId); return this; };
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
      const container = tabEl.closest('[role="tablist"]')?.parentElement || tabEl.closest('.js-tab-container');
      return AriaTabs.#instances.get(container);
    }
    return AriaTabs.#instances.get(idOrEl);
  }

  on(event, callback) {
    if (this._listeners[event]) this._listeners[event].push(callback);
    return this;
  }

  /**
   * イベント発火（個別、グローバル、コールバックオプションのすべてを処理）
   */
  _trigger(event, data) {
    this._listeners[event].forEach(cb => cb(data, this));
    AriaTabs.#globalListeners[event].forEach(cb => cb(data, this));
    const callbackName = `on${event.charAt(0).toUpperCase() + event.slice(1)}`;
    const callback = this.options.callback[callbackName];
    if (typeof callback === 'function') {
      callback(data, this);
    }
  }

  // --- 内部ロジック ---

  /**
   * 自分自身の階層にある要素のみをフィルタリング
   */
  _getOwnElements(selector) {
    return Array.from(this.container.querySelectorAll(selector)).filter(el => {
      return el.closest(this.options.containerSelector) === this.container;
    });
  }

  /**
   * 初期化：イベント登録と初期表示決定
   */
  _init() {
    if (!this.tabs.length) return;

    this.tabLists = Array.from(this.container.querySelectorAll('[role="tablist"]')).filter(el => {
      return el.closest(this.options.containerSelector) === this.container;
    });
    this.tabLists.forEach(list => list.addEventListener('click', this._onTabClickBound));
    
    this.activate(this._getInitialTabId(), { silent: true });

    // init イベントと onInit コールバックを発火
    this._trigger('init', this);
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
    const triggerTab = this.tabs.find(tab => tab.id === tabId) || this.tabs[0];
    if (!triggerTab) return;
    
    const targetPanelId = triggerTab.getAttribute('aria-controls');

    this.tabs.forEach(tab => {
      const isMatch = tab.getAttribute('aria-controls') === targetPanelId;
      tab.setAttribute('aria-selected', String(isMatch));
      tab.tabIndex = isMatch ? 0 : -1;
    });

    this.panels.forEach(panel => {
      const isVisible = panel.id === targetPanelId;
      this._togglePanel(panel, isVisible);
    });

    if (!silent && this.options.updateUrl) this._reflectUrl(triggerTab.id);

    // tabChange イベントと onTabChange コールバックを発火
    if (!silent) {
      this._trigger('tabChange', triggerTab);
    }
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
    this.tabLists.forEach(list => list.removeEventListener('click', this._onTabClickBound));
    AriaTabs.#instances.delete(this.container);
    this.container = null;
    this.tabs = [];
    this.panels = [];
    this.tabLists = [];
  }
}
