import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Box,
  Typography,
  Link,
  Skeleton,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import { Translate as TranslateIcon, ViewSidebar as ViewSidebarIcon } from '@mui/icons-material';
import { ExtensionConfigService, ExtensionConfig } from '#services/ExtensionConfigService';
import { checkDynamicsViaXrm, getEnvironmentUrlFromXrm } from '#utils/dynamicsDetection';
import { CurrentUserInfo, DynamicsAction } from '#types/global';
import { ThemeProvider } from '#contexts/ThemeContext';
import { LanguageProvider, useLanguage } from '#contexts/LanguageContext';
import { formActions, navigationActions, ActionConfig, localizeActions } from '#config/actions';
import UserInfoDialog from '#components/UserInfoDialog';
import InputDialog from '#components/InputDialog';
import { Language } from '../sidebar/i18n';

// 需要用户输入参数后再执行的动作类型
type NavigationDialogType = 'open-by-id' | 'new-record' | 'open-list';

const PopupApp: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const localizedFormActions = React.useMemo(() => localizeActions(formActions, t), [t]);
  const localizedNavigationActions = React.useMemo(
    () => localizeActions(navigationActions, t),
    [t]
  );
  const [extensionConfig, setExtensionConfig] = useState<ExtensionConfig>(
    ExtensionConfigService.getConfig()
  );
  // Optimistic UI: assume connected until check finishes
  const [isConnected, setIsConnected] = useState(true);
  const [isChecking, setIsChecking] = useState(true);
  const [inlineToast, setInlineToast] = useState<null | {
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>(null);
  const [userInfoOpen, setUserInfoOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<CurrentUserInfo | null>(null);
  // 导航类动作的输入弹窗状态（与侧边栏一致的自定义弹窗，替代浏览器原生 prompt）
  const [inputDialogOpen, setInputDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<NavigationDialogType>('open-by-id');
  const [entityName, setEntityName] = useState('');
  const [recordId, setRecordId] = useState('');

  // Detect if running in Firefox
  const isFirefox =
    typeof chrome !== 'undefined' && chrome.runtime && navigator.userAgent.includes('Firefox');

  useEffect(() => {
    const checkConnection = async () => {
      setIsChecking(true);
      try {
        const connected = await checkDynamicsViaXrm();
        setIsConnected(connected);
      } catch (error) {
        setIsConnected(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkConnection();

    // Subscribe to config changes
    const unsubscribe = ExtensionConfigService.subscribe(setExtensionConfig);
    return unsubscribe;
  }, []);

  const showInlineToast = (
    message: string,
    severity: 'success' | 'info' | 'warning' | 'error' = 'error'
  ) => {
    setInlineToast({ message, severity });
    window.setTimeout(() => setInlineToast(null), 4000);
  };

  // 向当前标签页的内容脚本发送动作请求
  const executeAction = async (actionId: DynamicsAction, actionData?: unknown) => {
    try {
      console.log('Executing action:', actionId);

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        console.error('No active tab found');
        return;
      }

      console.log('Sending message to tab:', tab.id);

      // Send message in the correct format that content script expects
      chrome.tabs.sendMessage(
        tab.id,
        {
          type: 'LEVELUP_REQUEST',
          action: actionId,
          data: actionData,
          requestId: Date.now().toString(),
        },
        response => {
          if (chrome.runtime.lastError) {
            console.error('Message send error:', chrome.runtime.lastError.message);
          } else {
            console.log('Action response:', response);
            if (response?.success) {
              console.log(`✅ Action executed successfully: ${actionId}`);
              // 用户信息动作返回数据后弹出详情对话框
              if (actionId === 'admin:get-user-info') {
                setUserInfo(response.data as CurrentUserInfo);
                setUserInfoOpen(true);
              }
            } else {
              console.error('❌ Action failed:', response?.error || 'Unknown error');
              // Show inline toast for the common form-only error so the popup UX is clear
              if (
                response?.error &&
                response.error.indexOf('Form actions can only be used') !== -1
              ) {
                showInlineToast(response.error, 'error');
              }
            }
          }
        }
      );

      console.log('Action message sent, keeping popup open');
    } catch (error) {
      console.error('Error executing action:', error);
    }
  };

  const handleActionClick = async (actionId: DynamicsAction) => {
    // 需要输入参数的动作先打开输入弹窗，参数由弹窗提交后携带
    if (actionId === 'navigation:open-record-by-id') {
      setDialogType('open-by-id');
      setInputDialogOpen(true);
      return;
    }
    if (actionId === 'navigation:new-record') {
      setDialogType('new-record');
      setInputDialogOpen(true);
      return;
    }
    if (actionId === 'navigation:open-list') {
      setDialogType('open-list');
      setInputDialogOpen(true);
      return;
    }

    await executeAction(actionId);
  };

  // 输入弹窗提交：按弹窗类型组装参数并执行对应导航动作
  const handleDialogSubmit = async () => {
    const entity = entityName.trim();
    if (!entity) return;

    let action: DynamicsAction;
    let data: Record<string, string>;
    switch (dialogType) {
      case 'open-by-id': {
        const id = recordId.trim();
        if (!id) return;
        action = 'navigation:open-record-by-id';
        data = { entityName: entity, recordId: id };
        break;
      }
      case 'new-record':
        action = 'navigation:new-record';
        data = { entityName: entity };
        break;
      case 'open-list':
        action = 'navigation:open-list';
        data = { entityName: entity };
        break;
    }

    setInputDialogOpen(false);
    await executeAction(action, data);
  };

  const handleDialogCancel = () => {
    setInputDialogOpen(false);
    setEntityName('');
    setRecordId('');
  };

  // 打开浏览器侧边栏，沿用当前已保存的显示模式
  const openSidebar = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        console.error('[Popup] 未找到活动标签页，无法打开侧边栏');
        return;
      }
      await chrome.sidePanel.open({ tabId: tab.id });
      // 仅在侧边栏成功打开后关闭弹窗
      window.close();
    } catch (error) {
      console.error('[Popup] 打开侧边栏失败:', error);
    }
  };

  // removed skeleton and early not-connected returns — always render full UI

  return (
    <Box
      sx={{
        width: '100%',
        background: theme =>
          `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 100%)`,
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: theme =>
          theme.palette.mode === 'dark'
            ? '0 4px 20px rgba(0,0,0,0.6)'
            : '0 4px 20px rgba(0,0,0,0.08)',
        display: 'flex',
      }}
    >
      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          p: 1,
          position: 'relative',
        }}
      >
        {/* Inline toast for quick feedback (overlay to avoid layout shift) */}
        {inlineToast && (
          <Box sx={{ position: 'absolute', left: 12, right: 12, top: 12, zIndex: 20 }}>
            <Alert severity={inlineToast.severity} onClose={() => setInlineToast(null)}>
              {inlineToast.message}
            </Alert>
          </Box>
        )}
        {/* Optimistic check spinner (small) */}
        {isChecking && (
          <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 30 }}>
            <CircularProgress size={18} />
          </Box>
        )}
        {/* 顶部工具栏：左侧打开侧边栏按钮，右侧语言切换 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 0.5,
            mb: 1,
          }}
        >
          {/* 打开浏览器侧边栏（Firefox 不支持 sidePanel API，不显示） */}
          {!isFirefox && (
            <Button
              size='small'
              variant='outlined'
              startIcon={<ViewSidebarIcon />}
              onClick={openSidebar}
              sx={{
                fontSize: '0.7rem',
                height: 28,
                py: 0,
                px: 1,
                textTransform: 'none',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
                '& .MuiButton-startIcon': { mr: 0.5, ml: 0 },
              }}
            >
              {t('popup.openSidebar')}
            </Button>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
            <TranslateIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            {/* 界面语言切换下拉框 */}
            <Select
              size='small'
              value={language}
              onChange={e => setLanguage(e.target.value as Language)}
              aria-label={t('language.label')}
              sx={{
                fontSize: '0.7rem',
                height: 28,
                minWidth: 90,
                '& .MuiSelect-select': {
                  py: 0.5,
                },
              }}
            >
              {/* 英文界面 */}
              <MenuItem value='en' sx={{ fontSize: '0.75rem' }}>
                {t('language.english')}
              </MenuItem>
              {/* 简体中文界面 */}
              <MenuItem value='zh' sx={{ fontSize: '0.75rem' }}>
                {t('language.chinese')}
              </MenuItem>
            </Select>
          </Box>
        </Box>

        {/* Form Actions */}
        {extensionConfig.showFormSection && (
          <Box sx={{ mb: 1.5 }}>
            <Typography
              variant='subtitle2'
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                mb: 0.5,
                color: 'text.primary',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
                opacity: 0.8,
              }}
            >
              {t('section.formActions')}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 0.5,
                p: 0.5,
                backgroundColor: theme =>
                  theme.palette.mode === 'dark'
                    ? theme.palette.background.paper
                    : 'rgba(255,255,255,0.85)',
                borderRadius: '6px',
                border: theme => `1px solid ${theme.palette.divider}`,
                alignItems: 'stretch',
              }}
            >
              {localizedFormActions.map((action: ActionConfig) => {
                const label = action.label || '';
                const lowered = label.toLowerCase();
                const getShort = (text: string) => {
                  if (text.indexOf('url') !== -1) return 'URL';
                  if (text.indexOf('clone') !== -1) return 'Clone';
                  if (text.indexOf('id') !== -1) return 'ID';
                  if (text.indexOf('find') !== -1) return 'Find';
                  if (text.indexOf('new') !== -1) return 'New';
                  if (text.indexOf('record') !== -1) return 'Record';
                  if (text.indexOf('solution') !== -1) return 'Solution';
                  return text.split(' ')[0].slice(0, 8);
                };
                const getIcon = (text: string) => {
                  if (text.indexOf('url') !== -1) return '🔗';
                  if (text.indexOf('clone') !== -1) return '📋';
                  if (text.indexOf('id') !== -1) return '🆔';
                  if (text.indexOf('find') !== -1) return '🔍';
                  if (text.indexOf('job') !== -1) return '⚙️';
                  if (text.indexOf('solution') !== -1) return '📦';
                  if (text.indexOf('record') !== -1) return '📄';
                  return '🔧';
                };

                const short = action.shortLabel || getShort(lowered);
                const iconEmoji = action.shortIcon || getIcon(lowered);
                const IconComp = (action.icon || null) as React.ComponentType<any> | null;

                return (
                  <Link
                    key={action.id}
                    component='button'
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleActionClick(action.id);
                    }}
                    sx={{
                      color: 'text.primary',
                      textDecoration: 'none',
                      fontSize: '0.7rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '6px 4px',
                      borderRadius: '6px',
                      fontWeight: 600,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.25,
                      transition: 'all 0.12s ease',
                      '&:hover': {
                        backgroundColor: theme =>
                          theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.02)'
                            : 'rgba(0,0,0,0.04)',
                        transform: 'translateY(-2px)',
                      },
                    }}
                    title={action.tooltip || action.label}
                  >
                    {IconComp ? (
                      <IconComp sx={{ fontSize: 18 }} />
                    ) : (
                      <span style={{ fontSize: 18 }}>{iconEmoji}</span>
                    )}
                    <span style={{ fontSize: 11, marginTop: 2 }}>{short}</span>
                  </Link>
                );
              })}
            </Box>
          </Box>
        )}

        {/* Navigation Actions */}
        {extensionConfig.showNavigationSection && (
          <Box sx={{ mb: 1.5 }}>
            <Typography
              variant='subtitle2'
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                mb: 0.5,
                color: 'text.primary',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
                opacity: 0.8,
              }}
            >
              {t('section.navigation')}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 0.5,
                p: 0.5,
                backgroundColor: theme =>
                  theme.palette.mode === 'dark'
                    ? theme.palette.background.paper
                    : 'rgba(255,255,255,0.85)',
                borderRadius: '6px',
                border: theme => `1px solid ${theme.palette.divider}`,
                alignItems: 'stretch',
              }}
            >
              {localizedNavigationActions.map((action: ActionConfig) => {
                const label = action.label || '';
                const lowered = label.toLowerCase();
                const short =
                  action.shortLabel ||
                  (lowered.indexOf('open') !== -1
                    ? 'Open'
                    : lowered.indexOf('list') !== -1
                      ? 'List'
                      : lowered.split(' ')[0].slice(0, 8));
                const iconEmoji =
                  action.shortIcon ||
                  (lowered.indexOf('open') !== -1
                    ? '🔗'
                    : lowered.indexOf('list') !== -1
                      ? '📋'
                      : '➡️');
                const IconComp2 = (action.icon || null) as React.ComponentType<any> | null;

                return (
                  <Link
                    key={action.id}
                    component='button'
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleActionClick(action.id);
                    }}
                    sx={{
                      color: 'text.primary',
                      textDecoration: 'none',
                      fontSize: '0.7rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '6px 4px',
                      borderRadius: '6px',
                      fontWeight: 600,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.25,
                      transition: 'all 0.12s ease',
                      '&:hover': {
                        backgroundColor: theme =>
                          theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.02)'
                            : 'rgba(0,0,0,0.04)',
                        transform: 'translateY(-2px)',
                      },
                    }}
                    title={action.tooltip || action.label}
                  >
                    {IconComp2 ? (
                      <IconComp2 sx={{ fontSize: 18 }} />
                    ) : (
                      <span style={{ fontSize: 18 }}>{iconEmoji}</span>
                    )}
                    <span style={{ fontSize: 11, marginTop: 2 }}>{short}</span>
                  </Link>
                );
              })}
            </Box>
          </Box>
        )}
      </Box>
      {/* 导航动作参数输入弹窗（复用侧边栏同款组件） */}
      <InputDialog
        open={inputDialogOpen}
        onClose={handleDialogCancel}
        onSubmit={handleDialogSubmit}
        title={
          dialogType === 'open-by-id'
            ? t('sidebar.dialog.openById')
            : dialogType === 'new-record'
              ? t('sidebar.dialog.newRecord')
              : t('sidebar.dialog.openList')
        }
        type={dialogType}
        entityName={entityName}
        recordId={recordId}
        onEntityNameChange={setEntityName}
        onRecordIdChange={setRecordId}
      />
      <UserInfoDialog
        open={userInfoOpen}
        onClose={() => setUserInfoOpen(false)}
        userInfo={userInfo}
      />
    </Box>
  );
};

// Initialize popup
const container = document.getElementById('popup-root');
if (container) {
  const root = createRoot(container);
  root.render(
    <LanguageProvider>
      <ThemeProvider>
        <PopupApp />
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default PopupApp;
