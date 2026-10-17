// 注入脚本中弹窗文案的多语言支持。
// 页面注入脚本无法访问 chrome.storage，语言由 content script 通过 postMessage 同步。

type DialogLanguage = 'en' | 'zh';

type DialogTextKey =
  | 'common.quickNavigation'
  | 'common.newTab'
  | 'common.openInNewTab'
  | 'common.noData'
  | 'common.closeDialog'
  | 'optionset.title'
  | 'optionset.optionsAvailable'
  | 'optionset.nameHeader'
  | 'optionset.valueHeader'
  | 'optionset.noneFound'
  | 'optionset.found'
  | 'allFields.title'
  | 'allFields.tableTitle'
  | 'allFields.description'
  | 'allFields.fieldHeader'
  | 'allFields.noteHeader'
  | 'allFields.valueHeader';

const DIALOG_TEXTS: Record<DialogLanguage, Record<DialogTextKey, string>> = {
  en: {
    'common.quickNavigation': 'Quick Navigation',
    'common.newTab': 'New Tab',
    'common.openInNewTab': 'Open in new tab',
    'common.noData': 'No data available',
    'common.closeDialog': 'Close dialog',
    'optionset.title': 'OptionSet Values ({count} controls)',
    'optionset.optionsAvailable': '{count} option(s) available',
    'optionset.nameHeader': 'OptionSet Name',
    'optionset.valueHeader': 'OptionSet Value',
    'optionset.noneFound': 'No option set controls found on this form',
    'optionset.found': 'Found {count} option set control(s)',
    'allFields.title': 'All Fields ({count})',
    'allFields.tableTitle': 'Field Values (Web API)',
    'allFields.description': '{count} field(s) returned via Web API for {entity}',
    'allFields.fieldHeader': 'Field Name',
    'allFields.noteHeader': 'Field Note',
    'allFields.valueHeader': 'Field Value',
  },
  zh: {
    'common.quickNavigation': '快速导航',
    'common.newTab': '新标签页',
    'common.openInNewTab': '在新标签页中打开',
    'common.noData': '暂无数据',
    'common.closeDialog': '关闭对话框',
    'optionset.title': '选项集值（{count} 个控件）',
    'optionset.optionsAvailable': '{count} 个选项可用',
    'optionset.nameHeader': '选项名称',
    'optionset.valueHeader': '选项集值',
    'optionset.noneFound': '此表单上未找到选项集控件',
    'optionset.found': '找到 {count} 个选项集控件',
    'allFields.title': '全部字段（{count}）',
    'allFields.tableTitle': '字段值（Web API）',
    'allFields.description': '通过 Web API 从 {entity} 返回 {count} 个字段',
    'allFields.fieldHeader': '字段',
    'allFields.noteHeader': '字段备注',
    'allFields.valueHeader': '字段值',
  },
};

// 语言同步到达前按浏览器语言兜底
let currentLanguage: DialogLanguage =
  typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('zh')
    ? 'zh'
    : 'en';

/**
 * 设置弹窗语言；仅接受受支持的语言值，忽略其他输入。
 */
export function setDialogLanguage(language: unknown): void {
  if (language === 'en' || language === 'zh') {
    currentLanguage = language;
  }
}

/**
 * 替换文案中的 {name} 占位符。
 */
export function dialogText(key: DialogTextKey, vars?: Record<string, string | number>): string {
  let text = DIALOG_TEXTS[currentLanguage][key];

  if (vars) {
    Object.entries(vars).forEach(([name, value]) => {
      text = text.split(`{${name}}`).join(String(value));
    });
  }

  return text;
}
