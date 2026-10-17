import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Typography,
  Divider,
} from '@mui/material';
import { Translate as TranslateIcon, Check as CheckIcon } from '@mui/icons-material';
import { useLanguage } from '#contexts/LanguageContext';
import { Language } from '../i18n';

const LANGUAGE_OPTIONS: { value: Language; labelKey: 'language.english' | 'language.chinese' }[] = [
  { value: 'en', labelKey: 'language.english' },
  { value: 'zh', labelKey: 'language.chinese' },
];

/**
 * Language switcher displayed next to the sidebar settings gear.
 * Clicking opens a menu with the available languages.
 */
const LanguageSelector: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (value: Language) => {
    setLanguage(value);
    handleClose();
  };

  return (
    <>
      <Tooltip title={t('language.switch')}>
        <IconButton
          onClick={handleClick}
          size='small'
          aria-label={t('language.switch')}
          sx={{
            color: 'text.primary',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <TranslateIcon fontSize='small' />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: {
              minWidth: 200,
              maxWidth: 240,
              '& .MuiMenuItem-root': {
                py: 1,
              },
            },
          },
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Typography
          variant='overline'
          sx={{
            px: 2,
            py: 1,
            fontWeight: 600,
            color: 'text.secondary',
            fontSize: '0.7rem',
          }}
        >
          {t('language.label')}
        </Typography>
        <Divider />

        {LANGUAGE_OPTIONS.map(option => {
          const isSelected = language === option.value;

          return (
            <MenuItem
              key={option.value}
              onClick={() => handleSelect(option.value)}
              selected={isSelected}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '& .MuiListItemText-primary': {
                    color: 'primary.contrastText',
                    fontWeight: 600,
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: isSelected ? 'primary.contrastText' : 'text.secondary',
                  minWidth: 36,
                }}
              >
                <TranslateIcon fontSize='small' />
              </ListItemIcon>
              <ListItemText
                primary={t(option.labelKey)}
                sx={{
                  '& .MuiListItemText-primary': {
                    color: isSelected ? 'inherit' : 'text.primary',
                    fontWeight: isSelected ? 600 : 400,
                  },
                }}
              />
              {isSelected && (
                <CheckIcon
                  fontSize='small'
                  sx={{
                    color: 'primary.contrastText',
                    ml: 1,
                  }}
                />
              )}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

export default LanguageSelector;
