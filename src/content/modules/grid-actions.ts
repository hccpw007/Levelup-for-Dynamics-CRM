// 网格操作模块：让页面上的主网格与子网格显示实体所有字段

/// <reference types="xrm" />

import { WebApiClient, GridAttributeMetadata } from './webapi-client';
import { dialogText } from './dialog-i18n';

// 平台网格列编辑器的固定 DOM 标识（与界面语言无关）
const COLUMN_EDITOR_BUTTON_ID = 'columnEditor-btn';
const ADD_COLUMNS_BUTTON_ID = 'AddColumnsBtn';
const DATA_SET_ROOT_SELECTOR = '[data-id^="dataSetRoot"]';
const AG_GRID_ROOT_SELECTOR = '.ag-root-wrapper';
const COLUMN_LIST_SELECTOR = '.ms-List[role="listbox"]';
const COLUMN_OPTION_SELECTOR = '[role="option"]';
const PROCESSED_ATTRIBUTE = 'data-levelup-grid-fields';

// 主网格列编辑器的等待与轮询参数
const UI_TIMEOUT_MS = 5000;
const UI_POLL_INTERVAL_MS = 50;
const OPTION_UPDATE_TIMEOUT_MS = 500;
const OPTION_UPDATE_POLL_MS = 25;
const PANEL_SETTLE_DELAY_MS = 300;
const APPLY_SETTLE_DELAY_MS = 800;
const MAX_GRID_COLUMNS = 2000;

// 子网格补全行数据时的并发上限，避免一次性压垮 Web API
const ROW_FETCH_BATCH_SIZE = 5;
// 列定义重建后等待 AG Grid 实例就绪的轮询参数
const ROW_SUPPLEMENT_RETRY_MS = 500;
const ROW_SUPPLEMENT_MAX_RETRIES = 20;
const DEFAULT_COLUMN_WIDTH = 150;
const MIN_COLUMN_WIDTH = 40;

interface AgGridColumnDef {
  colId?: string;
  field?: string;
  headerName?: string;
  [key: string]: unknown;
}

interface AgGridRowNode {
  data?: Record<string, unknown>;
}

interface AgGridApi {
  getColumnDefs(): AgGridColumnDef[];
  setColumnDefs(columnDefs: AgGridColumnDef[]): void;
  forEachNode(callback: (node: AgGridRowNode) => void): void;
  refreshCells(params?: { force?: boolean }): void;
  addEventListener(event: string, handler: () => void): void;
}

interface PcfDataSet {
  getTargetEntityType(): string;
}

interface ReactFiberNode {
  stateNode?: { api?: AgGridApi } | null;
  memoizedProps?: Record<string, unknown> | null;
  return?: ReactFiberNode | null;
}

interface GridRuntime {
  api: AgGridApi;
  dataSet: PcfDataSet | null;
}

/**
 * 网格字段动作：主网格复用平台原生「编辑列」面板批量添加列，
 * 子网格没有列编辑入口，改为直接扩展 AG Grid 列定义并补全行数据。
 */
export class GridActions {
  private readonly webApiClient = WebApiClient.getInstance();

  /**
   * 让当前页面的主网格与子网格显示所有字段
   */
  async showAllGridFields(): Promise<string> {
    let gridCount = 0;
    let fieldCount = 0;

    try {
      const mainGridResult = await this.expandMainGrids();
      gridCount += mainGridResult.gridCount;
      fieldCount += mainGridResult.fieldCount;
    } catch (error) {
      console.error('[GridActions] Failed to expand main grid columns:', error);
    }

    const subGridResult = await this.expandSubGrids();
    gridCount += subGridResult.gridCount;
    fieldCount += subGridResult.fieldCount;

    if (gridCount === 0) {
      return dialogText('gridFields.none');
    }

    return dialogText('gridFields.summary', {
      grids: gridCount,
      fields: fieldCount,
    });
  }

  /**
   * 主网格：自动操作原生列编辑器，添加全部可用列。
   * 返回处理的主网格数量与新增列总数。
   */
  private async expandMainGrids(): Promise<{ gridCount: number; fieldCount: number }> {
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>(`#${COLUMN_EDITOR_BUTTON_ID}`)
    ).filter(button => button.offsetParent !== null);

    let gridCount = 0;
    let fieldCount = 0;
    for (const button of buttons) {
      const dataSetRoot = button.closest(DATA_SET_ROOT_SELECTOR);
      // 同一网格只处理一次，避免重复点击列编辑器
      if (!dataSetRoot || dataSetRoot.hasAttribute(PROCESSED_ATTRIBUTE)) {
        continue;
      }
      dataSetRoot.setAttribute(PROCESSED_ATTRIBUTE, 'true');

      try {
        const addedCount = await this.applyAllColumnsViaEditor(button);
        gridCount++;
        fieldCount += addedCount;
      } catch (error) {
        console.error('[GridActions] Failed to add columns via column editor:', error);
      }
    }

    return { gridCount, fieldCount };
  }

  /**
   * 打开列编辑器并添加「所有」页签下的全部可用列，最后点击应用。
   * 返回新增列数量。
   */
  private async applyAllColumnsViaEditor(editorButton: HTMLButtonElement): Promise<number> {
    editorButton.click();

    const addButton = await this.waitForElement<HTMLButtonElement>(() => {
      const button = document.querySelector<HTMLButtonElement>(`#${ADD_COLUMNS_BUTTON_ID}`);
      return button && button.offsetParent !== null ? button : null;
    }, UI_TIMEOUT_MS);
    if (!addButton) {
      throw new Error(dialogText('gridFields.editorNotOpened'));
    }

    const editorPanel = addButton.closest<HTMLElement>('.ms-Panel');
    addButton.click();

    const columnList = await this.waitForElement<HTMLElement>(
      () => this.findColumnList(),
      UI_TIMEOUT_MS
    );
    if (!columnList) {
      throw new Error(dialogText('gridFields.editorNotOpened'));
    }

    // 默认页签即为当前实体的全部可添加字段（「相关」页签不含这些字段）
    const addedCount = await this.addRemainingColumns();

    // 添加列面板是覆盖在编辑列面板之上的第二层面板，先关闭它
    await this.closeAddColumnsPanel();

    if (addedCount > 0) {
      await this.applyColumnEditor(editorPanel);
    } else {
      this.closePanel(editorPanel);
    }

    return addedCount;
  }

  /**
   * 逐个点击尚未添加的列，直到列表为空。
   * 每次点击后列列表由平台异步重渲染，需等待数量减少后再继续。
   */
  private async addRemainingColumns(): Promise<number> {
    let addedCount = 0;

    while (addedCount < MAX_GRID_COLUMNS) {
      const columnList = this.findColumnList();
      if (!columnList) {
        break;
      }

      const option = columnList.querySelector<HTMLElement>(COLUMN_OPTION_SELECTOR);
      if (!option) {
        break;
      }

      const previousCount = columnList.querySelectorAll(COLUMN_OPTION_SELECTOR).length;
      option.click();
      addedCount++;

      await this.waitForColumnCountDecrease(previousCount);
    }

    return addedCount;
  }

  /**
   * 等待添加列列表的选项数量减少，确认 React 已完成重渲染
   */
  private async waitForColumnCountDecrease(previousCount: number): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < OPTION_UPDATE_TIMEOUT_MS) {
      await this.delay(OPTION_UPDATE_POLL_MS);
      const list = this.findColumnList();
      const currentCount = list?.querySelectorAll(COLUMN_OPTION_SELECTOR).length ?? 0;
      if (currentCount < previousCount) {
        return;
      }
    }
  }

  /**
   * 查找当前打开的添加列面板中的可用列列表
   */
  private findColumnList(): HTMLElement | null {
    const panels = Array.from(document.querySelectorAll<HTMLElement>('.ms-Panel.is-open'));
    for (let i = panels.length - 1; i >= 0; i--) {
      const list = panels[i].querySelector<HTMLElement>(COLUMN_LIST_SELECTOR);
      if (list) {
        return list;
      }
    }
    return null;
  }

  /**
   * 关闭覆盖在最上层的添加列面板
   */
  private async closeAddColumnsPanel(): Promise<void> {
    const list = this.findColumnList();
    this.closePanel(list?.closest<HTMLElement>('.ms-Panel') ?? null);
    await this.delay(PANEL_SETTLE_DELAY_MS);
  }

  /**
   * 点击编辑列面板的「应用」按钮使列变更生效
   */
  private async applyColumnEditor(editorPanel: HTMLElement | null): Promise<void> {
    const applyButton = Array.from(
      editorPanel?.querySelectorAll<HTMLButtonElement>('button') ?? []
    ).find(button => button.classList.contains('ms-Button--primary') && !button.disabled);

    if (!applyButton) {
      throw new Error(dialogText('gridFields.applyFailed'));
    }

    applyButton.click();
    await this.delay(APPLY_SETTLE_DELAY_MS);
  }

  /**
   * 关闭面板：优先用标题栏关闭按钮，添加列面板则退回底部的默认按钮
   */
  private closePanel(panel: HTMLElement | null): void {
    if (!panel) {
      return;
    }

    const closeButton =
      panel.querySelector<HTMLButtonElement>('.ms-Panel-closeButton') ??
      Array.from(panel.querySelectorAll<HTMLButtonElement>('button')).find(button =>
        button.classList.contains('ms-Button--default')
      );

    closeButton?.click();
  }

  /**
   * 子网格：直接扩展 AG Grid 列定义并补全行数据。
   * 返回处理的子网格数量与新增字段总数。
   */
  private async expandSubGrids(): Promise<{ gridCount: number; fieldCount: number }> {
    const wrappers = Array.from(document.querySelectorAll<HTMLElement>(AG_GRID_ROOT_SELECTOR));
    let gridCount = 0;
    let fieldCount = 0;

    for (const wrapper of wrappers) {
      const dataSetRoot = wrapper.closest(DATA_SET_ROOT_SELECTOR);
      // 主网格已由原生列编辑器处理；同一次操作中不重复处理同一个网格
      if (
        dataSetRoot?.querySelector(`#${COLUMN_EDITOR_BUTTON_ID}`) ||
        wrapper.hasAttribute(PROCESSED_ATTRIBUTE)
      ) {
        continue;
      }
      wrapper.setAttribute(PROCESSED_ATTRIBUTE, 'true');

      try {
        const addedCount = await this.expandSingleGrid(wrapper);
        if (addedCount > 0) {
          gridCount++;
          fieldCount += addedCount;
        }
      } catch (error) {
        console.error('[GridActions] Failed to expand subgrid columns:', error);
      }
    }

    return { gridCount, fieldCount };
  }

  /**
   * 扩展单个 AG Grid 网格的列定义并注册行数据补全
   */
  private async expandSingleGrid(wrapper: HTMLElement): Promise<number> {
    const runtime = this.findGridRuntime(wrapper);
    if (!runtime) {
      return 0;
    }

    const entityName = runtime.dataSet?.getTargetEntityType?.();
    if (!entityName) {
      return 0;
    }

    const existingDefs = runtime.api.getColumnDefs() ?? [];
    const existingFields = new Set(
      existingDefs.map(def => String(def.colId ?? def.field ?? '')).filter(Boolean)
    );

    const attributes = await this.webApiClient.retrieveGridAttributes(entityName);
    const missingAttributes = attributes.filter(
      attribute => !existingFields.has(attribute.logicalName)
    );
    if (missingAttributes.length === 0) {
      return 0;
    }

    const columnDefs = [
      ...existingDefs,
      ...missingAttributes.map(attribute => this.createColumnDef(attribute)),
    ];
    runtime.api.setColumnDefs(columnDefs);

    this.registerRowSupplement(entityName, attributes);
    return missingAttributes.length;
  }

  /**
   * 查找当前页面中指定实体的所有 AG Grid API。
   * setColumnDefs 可能替换网格 DOM，因此每次补全都重新从文档中定位。
   */
  private findEntityGridApis(entityName: string): AgGridApi[] {
    const apis: AgGridApi[] = [];
    document.querySelectorAll<HTMLElement>(AG_GRID_ROOT_SELECTOR).forEach(wrapper => {
      const runtime = this.findGridRuntime(wrapper);
      if (!runtime) {
        return;
      }
      try {
        if (runtime.dataSet?.getTargetEntityType() === entityName) {
          apis.push(runtime.api);
        }
      } catch (error) {
        console.error('[GridActions] Failed to read grid entity name:', error);
      }
    });
    return apis;
  }

  /**
   * 从 React 组件树中定位 AG Grid API 与 OneGrid 的 dataSet
   */
  private findGridRuntime(wrapper: HTMLElement): GridRuntime | null {
    let fiber = this.findReactFiber(wrapper);
    let api: AgGridApi | null = null;
    let dataSet: PcfDataSet | null = null;

    for (let depth = 0; fiber && depth < 60; depth++) {
      if (!api && fiber.stateNode?.api?.getColumnDefs) {
        api = fiber.stateNode.api;
      }

      const candidateDataSet = fiber.memoizedProps?.dataSet;
      if (!dataSet && this.isPcfDataSet(candidateDataSet)) {
        dataSet = candidateDataSet;
      }

      if (api && dataSet) {
        break;
      }
      fiber = fiber.return ?? null;
    }

    return api ? { api, dataSet } : null;
  }

  /**
   * React 将 fiber 挂在 DOM 元素上，key 前缀随构建变化
   */
  private findReactFiber(element: Element): ReactFiberNode | null {
    const fiberKey = Object.keys(element).find(key => key.startsWith('__reactFiber$'));
    if (!fiberKey) {
      return null;
    }
    return (element as unknown as Record<string, ReactFiberNode>)[fiberKey] ?? null;
  }

  /**
   * 校验对象是否为 PCF 数据集（具备取目标实体类型的能力）
   */
  private isPcfDataSet(value: unknown): value is PcfDataSet {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as PcfDataSet).getTargetEntityType === 'function'
    );
  }

  /**
   * 为新字段创建 AG Grid 列定义。
   * 不设置 OneGrid 的单元格渲染器，直接显示补全后的格式化文本。
   */
  private createColumnDef(attribute: GridAttributeMetadata): AgGridColumnDef {
    return {
      colId: attribute.logicalName,
      field: attribute.logicalName,
      headerName: attribute.displayName || attribute.logicalName,
      width: DEFAULT_COLUMN_WIDTH,
      minWidth: MIN_COLUMN_WIDTH,
      resizable: true,
      sortable: false,
      suppressMenu: true,
      suppressMovable: true,
      suppressSizeToFit: true,
      editable: false,
      headerClass: 'pcf-grid-header',
    };
  }

  /**
   * 注册行数据补全：首屏行立即补全，后续滚动加载的新行通过 modelUpdated 补齐。
   * setColumnDefs 会触发 OneGrid 重建（DOM 与 AG Grid API 实例随之更换），
   * 因此每轮补全都从文档重新定位当前实例，并各自维护已处理记录。
   */
  private registerRowSupplement(entityName: string, attributes: GridAttributeMetadata[]): void {
    const processedByGrid = new WeakMap<AgGridApi, Set<string>>();
    const listeningApis = new WeakSet<AgGridApi>();
    let running = false;

    const supplementAll = async (): Promise<void> => {
      const apis = this.findEntityGridApis(entityName);
      for (const api of apis) {
        let processedIds = processedByGrid.get(api);
        if (!processedIds) {
          processedIds = new Set<string>();
          processedByGrid.set(api, processedIds);
        }

        if (!listeningApis.has(api)) {
          listeningApis.add(api);
          api.addEventListener('modelUpdated', supplement);
        }

        await this.supplementRows(api, entityName, attributes, processedIds);
      }
    };

    const supplement = (): void => {
      // 防止 refreshCells 触发的 modelUpdated 重入
      if (running) {
        return;
      }
      running = true;
      void supplementAll().finally(() => {
        running = false;
      });
    };

    // 等平台完成列定义重建后再接入监听并补全首屏行
    let retries = 0;
    const registerWhenReady = (): void => {
      if (this.findEntityGridApis(entityName).length === 0) {
        if (retries++ < ROW_SUPPLEMENT_MAX_RETRIES) {
          setTimeout(registerWhenReady, ROW_SUPPLEMENT_RETRY_MS);
          return;
        }
        console.error('[GridActions] AG Grid instance not available after column update');
        return;
      }
      supplement();
    };
    setTimeout(registerWhenReady, ROW_SUPPLEMENT_RETRY_MS);
  }

  /**
   * 为尚未补全的已加载行批量获取记录值并刷新单元格
   */
  private async supplementRows(
    api: AgGridApi,
    entityName: string,
    attributes: GridAttributeMetadata[],
    processedIds: Set<string>
  ): Promise<void> {
    const pendingRows: Array<{ id: string; data: Record<string, unknown> }> = [];

    api.forEachNode(node => {
      const data = node.data;
      const recordId = data?.__rec_id;
      if (typeof recordId !== 'string' || processedIds.has(recordId)) {
        return;
      }
      processedIds.add(recordId);
      if (data) {
        pendingRows.push({ id: recordId, data });
      }
    });

    if (pendingRows.length === 0) {
      return;
    }

    for (let index = 0; index < pendingRows.length; index += ROW_FETCH_BATCH_SIZE) {
      const batch = pendingRows.slice(index, index + ROW_FETCH_BATCH_SIZE);
      await Promise.all(
        batch.map(async row => {
          try {
            // 使用平台原生 Web API，避免 DWA 初始化状态影响子网格补全
            const record = (await Xrm.WebApi.retrieveRecord(
              entityName,
              row.id
            )) as unknown as Record<string, unknown>;
            attributes.forEach(attribute => {
              row.data[attribute.logicalName] = this.extractDisplayValue(
                record,
                attribute.logicalName
              );
            });
          } catch (error) {
            console.error('[GridActions] Failed to load row values via Web API:', error);
          }
        })
      );
    }

    api.refreshCells({ force: true });
  }

  /**
   * 从 Web API 记录中提取字段的显示值。
   * 查找字段以 `_字段_value` 形式返回，格式化文本通过注解属性提供。
   */
  private extractDisplayValue(record: Record<string, unknown>, attributeName: string): unknown {
    const formatted = record[`${attributeName}@OData.Community.Display.V1.FormattedValue`];
    if (formatted !== undefined) {
      return formatted;
    }

    const lookupFormatted =
      record[`_${attributeName}_value@OData.Community.Display.V1.FormattedValue`];
    if (lookupFormatted !== undefined) {
      return lookupFormatted;
    }

    const value = record[attributeName];
    if (value !== undefined && value !== null && typeof value !== 'object') {
      return value;
    }

    const lookupValue = record[`_${attributeName}_value`];
    if (lookupValue !== undefined && lookupValue !== null) {
      return lookupValue;
    }

    return '';
  }

  /**
   * 轮询等待元素出现，超时返回 null
   */
  private async waitForElement<T>(getter: () => T | null, timeoutMs: number): Promise<T | null> {
    const startTime = Date.now();
    let element = getter();

    while (!element && Date.now() - startTime < timeoutMs) {
      await this.delay(UI_POLL_INTERVAL_MS);
      element = getter();
    }

    return element;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
