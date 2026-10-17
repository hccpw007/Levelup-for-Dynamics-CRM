import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Switch,
  FormControlLabel,
  Divider,
  Link,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  GitHub as GitHubIcon,
  Settings as SettingsIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Launch as LaunchIcon,
} from '@mui/icons-material';
import { githubApiService } from '#services/GitHubApiService';
import { useLanguage } from '#contexts/LanguageContext';

interface GitHubIntegrationSettingsProps {
  onToast: (message: string, severity: 'success' | 'info' | 'warning' | 'error') => void;
}

const GitHubIntegrationSettings: React.FC<GitHubIntegrationSettingsProps> = ({ onToast }) => {
  const { t } = useLanguage();
  const [config, setConfig] = useState({
    owner: '',
    repo: '',
  });
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    success: boolean;
    error?: string;
    repoInfo?: any;
  }>({ tested: false, success: false });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load saved configuration on mount
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      // Load from Chrome storage
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['github_config']);
        if (result.github_config) {
          const savedConfig = result.github_config;
          setConfig(savedConfig);
          // Update the service configuration
          githubApiService.configure(savedConfig);
        }
      }
    } catch (error) {
      console.error('Failed to load GitHub configuration:', error);
    }
  };

  const saveConfiguration = async () => {
    try {
      // Save to Chrome storage
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ github_config: config });
      }

      // Update the service configuration
      githubApiService.configure(config);
      onToast(t('github.configSaved'), 'success');
    } catch (error) {
      console.error('Failed to save GitHub configuration:', error);
      onToast(t('github.configSaveFailed'), 'error');
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setConnectionStatus({ tested: false, success: false });

    try {
      // Update service config with current form values
      githubApiService.configure(config);

      // Test basic connectivity
      const connectionResult = await githubApiService.testConnection();

      if (connectionResult.success) {
        // Get repository information
        const repoResult = await githubApiService.getRepositoryInfo();

        setConnectionStatus({
          tested: true,
          success: true,
          repoInfo: repoResult.success ? repoResult.data : null,
        });

        onToast(t('github.connectionSuccess'), 'success');
      } else {
        setConnectionStatus({
          tested: true,
          success: false,
          error: connectionResult.error,
        });

        onToast(t('github.connectionFailed', { error: String(connectionResult.error) }), 'error');
      }
    } catch (error) {
      setConnectionStatus({
        tested: true,
        success: false,
        error: error instanceof Error ? error.message : t('sidebar.unknownError'),
      });

      onToast(t('github.connectionTestFailed'), 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleConfigChange = (field: string, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    // Reset connection status when config changes
    if (connectionStatus.tested) {
      setConnectionStatus({ tested: false, success: false });
    }
  };

  const isConfigValid = config.owner.trim() && config.repo.trim();

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display='flex' alignItems='center' mb={2}>
          <GitHubIcon sx={{ mr: 1 }} />
          <Typography variant='h6'>{t('github.title')}</Typography>
        </Box>

        <Alert severity='info' sx={{ mb: 2 }}>
          <Typography variant='body2'>{t('github.intro')}</Typography>
        </Alert>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label={t('github.ownerLabel')}
            value={config.owner}
            onChange={e => handleConfigChange('owner', e.target.value)}
            placeholder={t('github.ownerPlaceholder')}
            helperText={t('github.ownerHelper')}
            size='small'
            required
          />

          <TextField
            label={t('github.repoLabel')}
            value={config.repo}
            onChange={e => handleConfigChange('repo', e.target.value)}
            placeholder={t('github.repoPlaceholder')}
            helperText={t('github.repoHelper')}
            size='small'
            required
          />

          <FormControlLabel
            control={
              <Switch checked={showAdvanced} onChange={e => setShowAdvanced(e.target.checked)} />
            }
            label={t('github.showAdvanced')}
          />

          {showAdvanced && (
            <>
              <Divider />
              <Alert severity='info' sx={{ mt: 1 }}>
                <Typography variant='body2'>
                  <strong>{t('github.noAuthTitle')}</strong> {t('github.noAuthText')}
                </Typography>
              </Alert>
            </>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant='contained'
            onClick={saveConfiguration}
            disabled={!isConfigValid}
            size='small'
          >
            {t('github.save')}
          </Button>

          <Button
            variant='outlined'
            onClick={testConnection}
            disabled={!isConfigValid || testing}
            startIcon={testing ? <CircularProgress size={16} /> : <RefreshIcon />}
            size='small'
          >
            {testing ? t('github.testing') : t('github.testConnection')}
          </Button>

          {connectionStatus.tested && (
            <Chip
              icon={connectionStatus.success ? <CheckIcon /> : <ErrorIcon />}
              label={connectionStatus.success ? t('github.connected') : t('github.failed')}
              color={connectionStatus.success ? 'success' : 'error'}
              size='small'
            />
          )}
        </Box>

        {connectionStatus.tested && !connectionStatus.success && connectionStatus.error && (
          <Alert severity='error' sx={{ mt: 2 }}>
            <Typography variant='body2'>
              <strong>{t('github.connectionError')}</strong> {connectionStatus.error}
            </Typography>
          </Alert>
        )}

        {connectionStatus.success && connectionStatus.repoInfo && (
          <Alert severity='success' sx={{ mt: 2 }}>
            <Box>
              <Typography variant='body2' gutterBottom>
                <strong>{t('github.repoInfo')}</strong>
              </Typography>
              <Box
                sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, fontSize: '0.875rem' }}
              >
                <Box>
                  {t('github.name')} {connectionStatus.repoInfo.name}
                </Box>
                <Box>
                  {t('github.description')}{' '}
                  {connectionStatus.repoInfo.description || t('common.noDescription')}
                </Box>
                <Box>
                  {t('github.starsForks', {
                    stars: connectionStatus.repoInfo.stars,
                    forks: connectionStatus.repoInfo.forks,
                  })}
                </Box>
                <Box>{t('github.openIssues', { count: connectionStatus.repoInfo.openIssues })}</Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                  <Link
                    href={connectionStatus.repoInfo.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                    {t('github.viewRepo')}
                    <LaunchIcon fontSize='small' />
                  </Link>
                </Box>
              </Box>
            </Box>
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        <Box>
          <Typography variant='body2' color='text.secondary' gutterBottom>
            <InfoIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
            {t('github.howItWorks')}
          </Typography>
          <Typography variant='body2' color='text.secondary' component='div'>
            <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
              <li>{t('github.howStep1')}</li>
              <li>{t('github.howStep2')}</li>
              <li>{t('github.howStep3')}</li>
              <li>{t('github.howStep4')}</li>
            </ul>
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default GitHubIntegrationSettings;
