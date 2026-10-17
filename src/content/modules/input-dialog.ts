// 页面内输入弹窗：承载导航动作的参数输入。
// 扩展 popup 窗口高度受浏览器限制，实体下拉无法完整展示，故改为在页面内弹出。

import { dialogText } from './dialog-i18n';

export interface InputDialogEntityOption {
  logicalName: string;
  displayName: string;
}

export interface InputDialogOptions {
  // 弹窗标题（调用方已按当前语言翻译）
  title: string;
  // 是否必须填写记录 ID（打开指定记录时需要）
  requireRecordId: boolean;
  // 实体自动补全候选列表
  entities: InputDialogEntityOption[];
}

export interface InputDialogResult {
  entityName: string;
  recordId: string;
}

export class InputDialog {
  private static readonly CSS = `
    .levelup-input-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(2px);
      z-index: 10000;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 8vh;
    }

    .levelup-input-dialog {
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      width: min(600px, 90vw);
      max-height: 84vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }

    .levelup-input-header {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #ffffff;
      padding: 16px 24px;
      font-size: 18px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .levelup-input-close {
      background: none;
      border: none;
      color: #ffffff;
      font-size: 24px;
      line-height: 1;
      cursor: pointer;
      padding: 0 4px;
    }

    .levelup-input-body {
      padding: 8px 24px 16px;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }

    .levelup-input-label {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin: 12px 0 6px;
    }

    .levelup-input-field,
    .levelup-input-record {
      width: 100%;
      box-sizing: border-box;
      padding: 9px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      color: #111827;
      background: #ffffff;
      outline: none;
    }

    .levelup-input-field:focus,
    .levelup-input-record:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }

    .levelup-input-options {
      display: none;
      margin-top: 6px;
      max-height: 40vh;
      overflow-y: auto;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: #ffffff;
    }

    .levelup-input-option {
      padding: 8px 12px;
      font-size: 13px;
      color: #374151;
      cursor: pointer;
    }

    .levelup-input-option:hover {
      background: #eff6ff;
      color: #1d4ed8;
    }

    .levelup-input-empty {
      padding: 12px;
      font-size: 13px;
      color: #9ca3af;
      text-align: center;
    }

    .levelup-input-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 24px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
      flex-shrink: 0;
    }

    .levelup-input-btn {
      padding: 8px 20px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      border: 1px solid #d1d5db;
      background: #ffffff;
      color: #374151;
    }

    .levelup-input-btn:hover {
      background: #f1f5f9;
    }

    .levelup-input-btn.primary {
      background: #2563eb;
      border-color: #2563eb;
      color: #ffffff;
    }

    .levelup-input-btn.primary:hover {
      background: #1d4ed8;
    }

    .levelup-input-btn.primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;

  private static styleInjected = false;

  // 注入弹窗样式，仅执行一次
  private static injectStyles(): void {
    if (this.styleInjected) {
      return;
    }

    const style = document.createElement('style');
    style.textContent = this.CSS;
    document.head.appendChild(style);
    this.styleInjected = true;
  }

  // 转义用户可见文本，防止 HTML 注入
  private static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 选项展示文本：显示名（逻辑名）
  private static formatOption(option: InputDialogEntityOption): string {
    return `${option.displayName} (${option.logicalName})`;
  }

  /**
   * 显示输入弹窗并等待用户提交。
   * 用户取消或关闭时返回 null。
   */
  static show(options: InputDialogOptions): Promise<InputDialogResult | null> {
    this.injectStyles();

    return new Promise(resolve => {
      // 用户从候选中点选实体时记录其逻辑名；手动输入时清空
      let selectedLogicalName = '';

      const recordIdField = options.requireRecordId
        ? `
            <label class="levelup-input-label">${this.escapeHtml(dialogText('input.recordId'))}</label>
            <input class="levelup-input-record" type="text" autocomplete="off"
              placeholder="${this.escapeHtml(dialogText('input.recordIdPlaceholder'))}" />
          `
        : '';

      const backdrop = document.createElement('div');
      backdrop.className = 'levelup-input-backdrop';
      backdrop.innerHTML = `
        <div class="levelup-input-dialog" role="dialog" aria-modal="true">
          <div class="levelup-input-header">
            <span>${this.escapeHtml(options.title)}</span>
            <button class="levelup-input-close" aria-label="${this.escapeHtml(dialogText('common.closeDialog'))}">×</button>
          </div>
          <div class="levelup-input-body">
            <label class="levelup-input-label">${this.escapeHtml(dialogText('input.entityName'))}</label>
            <input class="levelup-input-field" type="text" autocomplete="off"
              placeholder="${this.escapeHtml(dialogText('input.entityPlaceholder'))}" />
            <div class="levelup-input-options"></div>
            ${recordIdField}
          </div>
          <div class="levelup-input-footer">
            <button class="levelup-input-btn levelup-input-cancel">${this.escapeHtml(dialogText('input.cancel'))}</button>
            <button class="levelup-input-btn primary levelup-input-submit" disabled>${this.escapeHtml(dialogText('input.confirm'))}</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);

      const dialog = backdrop.querySelector<HTMLElement>('.levelup-input-dialog') as HTMLElement;
      const entityInput = backdrop.querySelector<HTMLInputElement>(
        '.levelup-input-field'
      ) as HTMLInputElement;
      const optionsList = backdrop.querySelector<HTMLElement>(
        '.levelup-input-options'
      ) as HTMLElement;
      const recordInput = backdrop.querySelector<HTMLInputElement>('.levelup-input-record');
      const submitButton = backdrop.querySelector<HTMLButtonElement>(
        '.levelup-input-submit'
      ) as HTMLButtonElement;
      const cancelButton = backdrop.querySelector<HTMLButtonElement>(
        '.levelup-input-cancel'
      ) as HTMLButtonElement;
      const closeButton = backdrop.querySelector<HTMLButtonElement>(
        '.levelup-input-close'
      ) as HTMLButtonElement;

      // 关闭弹窗、清理监听并返回结果
      function close(result: InputDialogResult | null): void {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('mousedown', handleOutsideClick);
        backdrop.remove();
        resolve(result);
      }

      // 实体与记录 ID 均满足要求时才允许提交
      const updateSubmitState = () => {
        const hasEntity = entityInput.value.trim().length > 0;
        const hasRecord = !recordInput || recordInput.value.trim().length > 0;
        submitButton.disabled = !hasEntity || !hasRecord;
      };

      // 按输入内容过滤实体候选并展示列表
      const renderOptions = () => {
        const query = entityInput.value.trim().toLowerCase();
        const matches = options.entities.filter(option => {
          if (!query) {
            return true;
          }
          return (
            option.displayName.toLowerCase().includes(query) ||
            option.logicalName.toLowerCase().includes(query)
          );
        });

        optionsList.innerHTML = matches.length
          ? matches
              .slice(0, 300)
              .map(option => {
                const text = this.formatOption(option);
                return `<div class="levelup-input-option" data-logical="${this.escapeHtml(option.logicalName)}">${this.escapeHtml(text)}</div>`;
              })
              .join('')
          : `<div class="levelup-input-empty">${this.escapeHtml(dialogText('input.noEntities'))}</div>`;
        optionsList.style.display = 'block';
      };

      // 解析用户输入的实体：优先使用点选结果，其次匹配逻辑名，最后保留原文
      const resolveEntityName = (): string => {
        const raw = entityInput.value.trim();
        if (selectedLogicalName) {
          return selectedLogicalName;
        }

        const matchedOption = options.entities.find(
          option =>
            option.logicalName.toLowerCase() === raw.toLowerCase() ||
            this.formatOption(option) === raw
        );
        return matchedOption ? matchedOption.logicalName : raw;
      };

      // 提交输入；不满足条件时忽略
      const submit = () => {
        const raw = entityInput.value.trim();
        const recordValue = recordInput ? recordInput.value.trim() : '';
        if (!raw || (recordInput && !recordValue)) {
          return;
        }
        close({ entityName: resolveEntityName(), recordId: recordValue });
      };

      // Escape 取消、Enter 提交
      function handleKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
          close(null);
        } else if (event.key === 'Enter') {
          submit();
        }
      }

      // 点击弹窗外部关闭
      function handleOutsideClick(event: MouseEvent): void {
        if (!dialog.contains(event.target as Node)) {
          close(null);
        }
      }

      entityInput.addEventListener('input', () => {
        selectedLogicalName = '';
        updateSubmitState();
        renderOptions();
      });
      entityInput.addEventListener('focus', () => {
        renderOptions();
      });

      optionsList.addEventListener('mousedown', event => {
        const target = (event.target as HTMLElement).closest<HTMLElement>('.levelup-input-option');
        if (!target) {
          return;
        }
        // 阻止输入框失焦，避免点击时列表先被关闭
        event.preventDefault();
        selectedLogicalName = target.dataset.logical || '';
        entityInput.value = target.textContent?.trim() || '';
        optionsList.style.display = 'none';
        updateSubmitState();
      });

      recordInput?.addEventListener('input', updateSubmitState);
      submitButton.addEventListener('click', submit);
      cancelButton.addEventListener('click', () => close(null));
      closeButton.addEventListener('click', () => close(null));
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleOutsideClick);

      entityInput.focus();
    });
  }
}
