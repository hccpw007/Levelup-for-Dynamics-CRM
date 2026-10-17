import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  IconButton,
} from '@mui/material';
import { AccountCircle as UserIcon, Close as CloseIcon } from '@mui/icons-material';
import { useLanguage } from '#contexts/LanguageContext';
import type { CurrentUserInfo } from '#types/global';

interface UserInfoDialogProps {
  open: boolean;
  onClose: () => void;
  userInfo: CurrentUserInfo | null;
}

/**
 * 展示当前用户 ID、姓名、语言及安全角色。
 * 侧边栏与快速模式共用此对话框。
 */
const UserInfoDialog: React.FC<UserInfoDialogProps> = ({ open, onClose, userInfo }) => {
  const { t } = useLanguage();

  // 渲染单个字段：上方字段名，下方字段值
  const renderField = (label: string, value: string) => (
    <Box>
      <Typography variant='caption' color='text.secondary'>
        {label}
      </Typography>
      <Typography variant='body2' sx={{ wordBreak: 'break-all' }}>
        {value}
      </Typography>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <UserIcon color='primary' />
            {/* 对话框标题：当前用户信息 */}
            <Typography variant='h6'>{t('userInfo.title')}</Typography>
          </Box>
          <IconButton onClick={onClose} size='small' sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {userInfo && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* 当前用户 ID */}
            {renderField(t('userInfo.userId'), userInfo.userId)}
            {/* 当前用户名 */}
            {renderField(t('userInfo.userName'), userInfo.userName)}
            {/* 当前用户界面语言 ID */}
            {renderField(t('userInfo.languageId'), String(userInfo.languageId))}
            {/* 当前用户的安全角色名称列表 */}
            <Box>
              <Typography variant='caption' color='text.secondary'>
                {t('userInfo.roles')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.75 }}>
                {userInfo.roles.length > 0 ? (
                  userInfo.roles.map(role => <Chip key={role} label={role} size='small' />)
                ) : (
                  <Typography variant='body2' color='text.secondary'>
                    {t('userInfo.noRoles')}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {/* 关闭对话框按钮 */}
        <Button onClick={onClose} variant='contained'>
          {t('info.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserInfoDialog;
