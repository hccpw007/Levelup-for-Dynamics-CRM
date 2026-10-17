// 注入脚本中弹窗文案的多语言支持。
// 页面注入脚本无法访问 chrome.storage，语言由 content script 通过 postMessage 同步。

type DialogLanguage = 'en' | 'zh';

type DialogTextKey =
  | 'common.quickNavigation'
  | 'common.newTab'
  | 'common.openInNewTab'
  | 'common.noData'
  | 'common.closeDialog'
  | 'common.searchPlaceholder'
  | 'common.searchResults'
  | 'common.copy'
  | 'common.copied'
  | 'common.copyFailed'
  | 'common.failed'
  | 'common.copyLogicalNameTooltip'
  | 'common.content'
  | 'common.contentClickToCopy'
  | 'common.information'
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
  | 'allFields.valueHeader'
  | 'allFields.retrieveError'
  | 'allFields.nullValue'
  | 'allFields.emptyString'
  | 'allFields.emptyArray'
  | 'allFields.errorReadingValue'
  | 'form.defaultSolutionNotice'
  | 'form.defaultSolutionFallbackName'
  | 'form.parseXmlFallback'
  | 'form.refreshWithoutSave'
  | 'form.recordUrlTitle'
  | 'form.recordIdTitle'
  | 'form.openEditorFailed'
  | 'form.loadProcessesFailed'
  | 'form.processesTitle'
  | 'form.processesFound'
  | 'form.noProcessesTitle'
  | 'form.noProcessesText'
  | 'form.notAvailable'
  | 'form.noDescription'
  | 'form.activeEntity'
  | 'form.activeGlobal'
  | 'form.processRealtimeWorkflows'
  | 'form.processBackgroundWorkflows'
  | 'form.processFlows'
  | 'form.processBusinessRules'
  | 'form.processBusinessProcessFlows'
  | 'form.processActions'
  | 'form.processCustomApis'
  | 'form.processNameHeader'
  | 'form.processDescriptionHeader'
  | 'form.processStatusHeader'
  | 'form.processOwnerHeader';

const DIALOG_TEXTS: Record<DialogLanguage, Record<DialogTextKey, string>> = {
  en: {
    'common.quickNavigation': 'Quick Navigation',
    'common.newTab': 'New Tab',
    'common.openInNewTab': 'Open in new tab',
    'common.noData': 'No data available',
    'common.closeDialog': 'Close dialog',
    'common.searchPlaceholder': 'Search...',
    'common.searchResults': '{visible} of {total} items match "{query}"',
    'common.copy': 'Copy',
    'common.copied': 'Copied!',
    'common.copyFailed': 'Copy Failed',
    'common.failed': 'Failed',
    'common.copyLogicalNameTooltip': 'Click to copy logical name to clipboard',
    'common.content': 'Content',
    'common.contentClickToCopy': 'Content (Click to copy)',
    'common.information': 'Information',
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
    'allFields.retrieveError': 'Error retrieving fields via Web API',
    'allFields.nullValue': '[NULL]',
    'allFields.emptyString': '[EMPTY STRING]',
    'allFields.emptyArray': '[empty array]',
    'allFields.errorReadingValue': '[Error reading value]',
    'form.defaultSolutionNotice':
      'No custom preferred solution found. Using {solution}. You can set your preferred solution in Power Platform Maker Portal.',
    'form.defaultSolutionFallbackName': 'Default Solution',
    'form.parseXmlFallback': 'Unable to parse data XML, falling back to attribute checks',
    'form.refreshWithoutSave': 'Form refreshed without save. Autosave turned off.',
    'form.recordUrlTitle': 'Record URL',
    'form.recordIdTitle': 'Record ID',
    'form.openEditorFailed': 'Failed to open form editor: {error}',
    'form.loadProcessesFailed': 'Failed to load table processes: {error}',
    'form.processesTitle': 'Table Processes for {entity} ({count} total)',
    'form.processesFound': '{category}: {count}',
    'form.noProcessesTitle': 'No processes found',
    'form.noProcessesText':
      'No workflows, business rules, flows, BPFs, actions, or custom APIs were found for {entity}.',
    'form.notAvailable': 'N/A',
    'form.noDescription': 'No description',
    'form.activeEntity': 'Active (Entity)',
    'form.activeGlobal': 'Active (Global)',
    'form.processRealtimeWorkflows': 'Realtime Workflows',
    'form.processBackgroundWorkflows': 'Background Workflows',
    'form.processFlows': 'Flows',
    'form.processBusinessRules': 'Business Rules',
    'form.processBusinessProcessFlows': 'Business Process Flows',
    'form.processActions': 'Actions',
    'form.processCustomApis': 'Custom APIs',
    'form.processNameHeader': 'Name',
    'form.processDescriptionHeader': 'Description',
    'form.processStatusHeader': 'Status',
    'form.processOwnerHeader': 'Owner',
  },
  zh: {
    'common.quickNavigation': '快速导航',
    'common.newTab': '新标签页',
    'common.openInNewTab': '在新标签页中打开',
    'common.noData': '暂无数据',
    'common.closeDialog': '关闭对话框',
    'common.searchPlaceholder': '搜索...',
    'common.searchResults': '匹配“{query}”的条目：{visible} / {total}',
    'common.copy': '复制',
    'common.copied': '已复制！',
    'common.copyFailed': '复制失败',
    'common.failed': '失败',
    'common.copyLogicalNameTooltip': '点击复制逻辑名到剪贴板',
    'common.content': '内容',
    'common.contentClickToCopy': '内容（点击复制）',
    'common.information': '信息',
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
    'allFields.retrieveError': '通过 Web API 获取字段失败',
    'allFields.nullValue': '[空值]',
    'allFields.emptyString': '[空字符串]',
    'allFields.emptyArray': '[空数组]',
    'allFields.errorReadingValue': '[读取值出错]',
    'form.defaultSolutionNotice':
      '未找到自定义首选解决方案，正在使用 {solution}。可在 Power Platform Maker Portal 中设置首选解决方案。',
    'form.defaultSolutionFallbackName': '默认解决方案',
    'form.parseXmlFallback': '无法解析数据 XML，改用字段变更检查',
    'form.refreshWithoutSave': '表单已刷新（未保存），自动保存已关闭。',
    'form.recordUrlTitle': '记录 URL',
    'form.recordIdTitle': '记录 ID',
    'form.openEditorFailed': '打开表单编辑器失败：{error}',
    'form.loadProcessesFailed': '加载表流程失败：{error}',
    'form.processesTitle': '{entity} 的表流程（共 {count} 个）',
    'form.processesFound': '{category}：{count} 个',
    'form.noProcessesTitle': '未找到流程',
    'form.noProcessesText':
      '未找到 {entity} 的工作流、业务规则、云端流、业务流程、操作或自定义 API。',
    'form.notAvailable': '无',
    'form.noDescription': '无描述',
    'form.activeEntity': '已启用（实体）',
    'form.activeGlobal': '已启用（全局）',
    'form.processRealtimeWorkflows': '实时工作流',
    'form.processBackgroundWorkflows': '后台工作流',
    'form.processFlows': '云端流',
    'form.processBusinessRules': '业务规则',
    'form.processBusinessProcessFlows': '业务流程',
    'form.processActions': '操作',
    'form.processCustomApis': '自定义 API',
    'form.processNameHeader': '名称',
    'form.processDescriptionHeader': '描述',
    'form.processStatusHeader': '状态',
    'form.processOwnerHeader': '负责人',
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
