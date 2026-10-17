import React from 'react';
import { Backdrop, CircularProgress, Typography, Box } from '@mui/material';
import { useLanguage } from '#contexts/LanguageContext';

interface LoadingOverlayProps {
  open: boolean;
}

const LoadingOverlayComponent: React.FC<LoadingOverlayProps> = ({ open }) => {
  const { t } = useLanguage();

  return (
    <Backdrop sx={{ color: '#fff', zIndex: theme => theme.zIndex.drawer + 1 }} open={open}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <CircularProgress color='inherit' />
        <Typography sx={{ mt: 2 }}>{t('common.processing')}</Typography>
      </Box>
    </Backdrop>
  );
};

const LoadingOverlay = React.memo(LoadingOverlayComponent);

export default LoadingOverlay;
