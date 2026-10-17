import React, { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { messageService } from '#services/MessageService';
import { debounce } from '#utils/debounce';
import { useLanguage } from '#contexts/LanguageContext';
import { SearchResult, UserToImpersonate } from '#hooks/useImpersonation';

interface UserRoleDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (user: UserToImpersonate) => void;
}

// 与服务端搜索接口一致：至少输入 2 个字符才发起查询
const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 500;

/**
 * 用户安全角色查询弹窗：搜索并选择一个用户，再交给调用方查询其角色。
 */
const UserRoleDialog: React.FC<UserRoleDialogProps> = ({ open, onClose, onSubmit }) => {
  const { t } = useLanguage();
  const [inputValue, setInputValue] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserToImpersonate | null>(null);
  const [searchResults, setSearchResults] = useState<UserToImpersonate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // 每次打开时重置上一次的搜索与会话状态
  useEffect(() => {
    if (open) {
      setInputValue('');
      setSelectedUser(null);
      setSearchResults([]);
      setSearchError('');
    }
  }, [open]);

  const searchUsers = useMemo(
    () =>
      debounce(async (query: string) => {
        setIsSearching(true);
        setSearchError('');
        try {
          const response = await messageService.searchUsers(query);
          if (!response.success) {
            throw new Error(response.error || 'Unknown error');
          }

          const result = response.data as SearchResult;
          setSearchResults(Array.isArray(result?.users) ? result.users : []);
        } catch (error) {
          console.error('[UserRoleDialog] Failed to search users:', error);
          setSearchResults([]);
          setSearchError(t('userRoles.loadFailed'));
        } finally {
          setIsSearching(false);
        }
      }, SEARCH_DEBOUNCE_MS),
    [t]
  );

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (value.trim().length >= MIN_SEARCH_LENGTH) {
      searchUsers(value.trim());
    } else {
      setSearchResults([]);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      {/* 动作标题：查看指定用户的安全角色 */}
      <DialogTitle>{t('userRoles.dialogTitle')}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Autocomplete<UserToImpersonate>
            fullWidth
            options={searchResults}
            value={selectedUser}
            onChange={(event, newValue) => {
              setSelectedUser(newValue);
              // 选中用户后立即查询其角色，无需再点额外的提交按钮
              if (newValue) {
                onSubmit(newValue);
              }
            }}
            inputValue={selectedUser ? selectedUser.fullname : inputValue}
            onInputChange={(event, newValue, reason) => {
              // 选择或清除后由 onChange 管理选中用户，避免把姓名当作新关键字再次搜索
              if (selectedUser && reason !== 'clear') {
                return;
              }
              handleInputChange(newValue);
            }}
            getOptionLabel={option => option.fullname}
            isOptionEqualToValue={(option, value) => option.systemuserid === value.systemuserid}
            loading={isSearching}
            loadingText={t('userRoles.searching')}
            noOptionsText={
              inputValue.trim().length < MIN_SEARCH_LENGTH
                ? t('userRoles.noOptionsMin')
                : t('userRoles.noUsers')
            }
            renderOption={(props, option) => {
              const { key, ...otherProps } = props;
              return (
                <Box
                  component='li'
                  key={key}
                  {...otherProps}
                  sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                >
                  <Typography variant='body2' sx={{ fontWeight: 500 }}>
                    {option.fullname}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {option.internalemailaddress || option.domainname}
                  </Typography>
                </Box>
              );
            }}
            renderInput={params => (
              <TextField
                {...params}
                autoFocus
                margin='dense'
                label={t('userRoles.searchLabel')}
                placeholder={t('userRoles.searchPlaceholder')}
                variant='outlined'
                slotProps={{
                  input: {
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {isSearching ? <CircularProgress size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  },
                }}
                helperText={
                  selectedUser
                    ? t('userRoles.selected', {
                        name: selectedUser.fullname,
                        email: selectedUser.internalemailaddress,
                      })
                    : ''
                }
              />
            )}
          />
        </Box>
        {searchError && (
          <Typography variant='caption' color='error' sx={{ mt: 1, display: 'block' }}>
            {searchError}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        {/* 关闭弹窗，不执行查询 */}
        <Button onClick={onClose} color='inherit'>
          {t('common.cancel')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserRoleDialog;
