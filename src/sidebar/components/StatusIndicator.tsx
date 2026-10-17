import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { Circle as CircleIcon } from '@mui/icons-material';
import { useLanguage } from '#contexts/LanguageContext';

interface StatusIndicatorProps {
  loading: boolean;
  connected: boolean;
  environmentUrl?: string;
  onOpenAdmin?: (environmentUrl?: string) => void;
}

const StatusIndicatorComponent: React.FC<StatusIndicatorProps> = ({
  loading,
  connected,
  environmentUrl,
  onOpenAdmin,
}) => {
  const { t } = useLanguage();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={12} />
        <Typography variant='body2' sx={{ fontSize: '0.75rem' }}>
          {t('status.checking')}
        </Typography>
      </Box>
    );
  }

  const handleClick = () => {
    if (onOpenAdmin) onOpenAdmin(environmentUrl);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
      {/* Status dot */}
      <CircleIcon
        sx={{
          fontSize: 18,
          color: connected ? 'success.main' : 'error.main',
          flexShrink: 0,
        }}
      />
      {/* Environment URL (clickable) */}
      <Box
        component='button'
        onClick={handleClick}
        sx={{
          appearance: 'none',
          border: 'none',
          background: 'transparent',
          padding: 0,
          margin: 0,
          cursor: environmentUrl ? 'pointer' : 'default',
          minWidth: 0,
          flex: 1,
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
        }}
        title={environmentUrl ? t('status.openAdmin') : undefined}
      >
        <Typography
          variant='body2'
          sx={{
            color: 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '0.85rem',
            fontWeight: 600,
            minWidth: 0,
            flex: 1,
          }}
        >
          {environmentUrl || (connected ? t('status.connected') : t('status.notConnected'))}
        </Typography>
      </Box>
    </Box>
  );
};

const StatusIndicator = React.memo(StatusIndicatorComponent);

export default StatusIndicator;
