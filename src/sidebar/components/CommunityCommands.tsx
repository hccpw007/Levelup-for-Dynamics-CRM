import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  Button,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Link,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Code as CodeIcon,
  Person as AuthorIcon,
  CalendarToday as DateIcon,
  Category as CategoryIcon,
  Tag as TagIcon,
  GitHub as GitHubIcon,
  Launch as LaunchIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  CloudDownload as InstallIcon,
} from '@mui/icons-material';
import { githubApiService } from '#services/GitHubApiService';
import { useLanguage } from '#contexts/LanguageContext';
import { CustomCommandsService } from '#services/CustomCommandsService';

interface CommunityCommand {
  title: string;
  url: string;
  state: string;
  labels: string[];
  createdAt: string;
  author: string;
  body?: string;
  metadata?: {
    name?: string;
    description?: string;
    category?: string;
    tags?: string[];
    code?: string;
  };
}

interface CommunityCommandsProps {
  onToast: (message: string, severity: 'success' | 'info' | 'warning' | 'error') => void;
}

const CommunityCommands: React.FC<CommunityCommandsProps> = ({ onToast }) => {
  const { t } = useLanguage();
  const [commands, setCommands] = useState<CommunityCommand[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean;
    command: CommunityCommand | null;
  }>({ open: false, command: null });
  const [installing, setInstalling] = useState<string | null>(null);

  const categories = [
    { value: 'form-actions', labelKey: 'community.categoryFormActions' },
    { value: 'navigation-actions', labelKey: 'community.categoryNavigationActions' },
    { value: 'admin-actions', labelKey: 'community.categoryAdminActions' },
    { value: 'debugging-actions', labelKey: 'community.categoryDebuggingActions' },
    { value: 'view-actions', labelKey: 'community.categoryViewActions' },
    { value: 'data-manipulation', labelKey: 'community.categoryDataManipulation' },
    { value: 'reporting', labelKey: 'community.categoryReporting' },
    { value: 'automation', labelKey: 'community.categoryAutomation' },
    { value: 'utilities', labelKey: 'community.categoryUtilities' },
    { value: 'miscellaneous', labelKey: 'community.categoryMiscellaneous' },
  ] as const;

  // 将分类 slug 转换为当前语言的显示名，未知分类保留原值
  const getCategoryLabel = (category?: string): string => {
    const matched = categories.find(item => item.value === category);
    return matched ? t(matched.labelKey) : category || t('community.uncategorized');
  };

  // Load community commands on mount
  useEffect(() => {
    loadCommunityCommands();
  }, []);

  const loadCommunityCommands = async () => {
    setLoading(true);
    try {
      const result = await githubApiService.searchCommands('new-command');

      if (result.success && result.commands) {
        // Process the commands to extract metadata
        const processedCommands = result.commands.map(command => ({
          ...command,
          metadata: parseCommandMetadata(command),
        }));

        setCommands(processedCommands);
        onToast(t('community.found', { count: processedCommands.length }), 'info');
      } else {
        onToast(t('community.loadFailed', { error: String(result.error) }), 'error');
      }
    } catch (error) {
      console.error('Failed to load community commands:', error);
      onToast(t('community.connectFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const parseCommandMetadata = (command: any): any => {
    // This would parse the GitHub issue body to extract command metadata
    // For now, return basic parsing based on title and labels

    const categoryLabel = command.labels.find((label: string) => label.startsWith('category:'));
    const tagLabels = command.labels.filter((label: string) => label.startsWith('tag:'));

    return {
      name: command.title.replace('New Command: ', ''),
      category: categoryLabel ? categoryLabel.replace('category:', '') : 'miscellaneous',
      tags: tagLabels.map((tag: string) => tag.replace('tag:', '')),
      description: t('community.contributedCommand'),
    };
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      await loadCommunityCommands();
      return;
    }

    setLoading(true);
    try {
      const result = await githubApiService.searchCommands(searchQuery);

      if (result.success && result.commands) {
        const processedCommands = result.commands.map(command => ({
          ...command,
          metadata: parseCommandMetadata(command),
        }));

        setCommands(processedCommands);
      } else {
        onToast(t('community.searchFailed', { error: String(result.error) }), 'error');
      }
    } catch (error) {
      onToast(t('community.searchFailedShort'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredCommands = commands.filter(command => {
    if (selectedCategory && command.metadata?.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  const handlePreviewCommand = (command: CommunityCommand) => {
    setPreviewDialog({ open: true, command });
  };

  const handleInstallCommand = async (command: CommunityCommand) => {
    if (!command.metadata?.name) {
      onToast(t('community.missingMetadata'), 'error');
      return;
    }

    setInstalling(command.url);

    try {
      // For now, create a placeholder command
      // In a real implementation, you would fetch the full issue content
      // and parse the JavaScript code from the issue body

      const commandData = {
        name: command.metadata.name,
        description: command.metadata.description || t('community.contributedCommand'),
        category: command.metadata.category,
        tags: command.metadata.tags || [],
        code: `// Community command: ${command.metadata.name}
// Source: ${command.url}
// TODO: Implement the actual command code

console.log('This is a placeholder for the community command');
console.log('Visit the GitHub issue to see the full implementation: ${command.url}');

// Example command structure:
function ${command.metadata.name.replace(/\s+/g, '')}() {
  try {
    // Command implementation goes here
    console.log('Community command executed successfully');
  } catch (error) {
    console.error('Command execution failed:', error);
  }
}

// Execute the command
${command.metadata.name.replace(/\s+/g, '')}();`,
        icon: 'cloud_download',
      };

      const newCommand = await CustomCommandsService.createCommand(commandData);
      onToast(t('community.installSuccess', { name: command.metadata.name }), 'success');
    } catch (error) {
      console.error('Failed to install command:', error);
      onToast(t('community.installFailed'), 'error');
    } finally {
      setInstalling(null);
    }
  };

  return (
    <>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display='flex' justifyContent='space-between' alignItems='center' mb={2}>
            <Typography variant='h6' sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GitHubIcon />
              {t('community.title')}
            </Typography>
            <Tooltip title={t('community.refresh')}>
              <IconButton onClick={loadCommunityCommands} disabled={loading} size='small'>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Search and Filters */}
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              size='small'
              placeholder={t('community.searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position='end'>
                    <Button onClick={handleSearch} size='small' disabled={loading}>
                      {t('community.search')}
                    </Button>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1 }}
            />

            {/* Category Filter */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              <Chip
                label={t('community.allCategories')}
                variant={selectedCategory === '' ? 'filled' : 'outlined'}
                onClick={() => setSelectedCategory('')}
                size='small'
              />
              {categories.map(category => (
                <Chip
                  key={category.value}
                  label={t(category.labelKey)}
                  variant={selectedCategory === category.value ? 'filled' : 'outlined'}
                  onClick={() => setSelectedCategory(category.value)}
                  size='small'
                />
              ))}
            </Box>
          </Box>

          {/* Commands List */}
          {loading ? (
            <Box display='flex' justifyContent='center' py={4}>
              <CircularProgress />
            </Box>
          ) : commands.length === 0 ? (
            <Alert severity='info'>
              <Typography variant='body2'>{t('community.empty')}</Typography>
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {filteredCommands.map((command, index) => (
                <Accordion key={command.url} variant='outlined'>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                      <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                        {command.metadata?.name || command.title}
                      </Typography>
                      <Box
                        sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}
                      >
                        <Chip
                          icon={<CategoryIcon />}
                          label={getCategoryLabel(command.metadata?.category)}
                          size='small'
                          variant='outlined'
                        />
                        <Chip
                          icon={<AuthorIcon />}
                          label={command.author}
                          size='small'
                          variant='outlined'
                        />
                        <Chip
                          icon={<DateIcon />}
                          label={new Date(command.createdAt).toLocaleDateString()}
                          size='small'
                          variant='outlined'
                        />
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Typography variant='body2' color='text.secondary'>
                        {command.metadata?.description || t('community.noDescription')}
                      </Typography>

                      {command.metadata?.tags && command.metadata.tags.length > 0 && (
                        <Box>
                          <Typography
                            variant='caption'
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}
                          >
                            <TagIcon fontSize='small' />
                            {t('community.tags')}
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {command.metadata.tags.map(tag => (
                              <Chip key={tag} label={tag} size='small' />
                            ))}
                          </Box>
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                          size='small'
                          variant='outlined'
                          startIcon={<CodeIcon />}
                          onClick={() => handlePreviewCommand(command)}
                        >
                          {t('community.preview')}
                        </Button>
                        <Button
                          size='small'
                          variant='contained'
                          startIcon={
                            installing === command.url ? (
                              <CircularProgress size={16} />
                            ) : (
                              <InstallIcon />
                            )
                          }
                          onClick={() => handleInstallCommand(command)}
                          disabled={installing === command.url}
                        >
                          {installing === command.url
                            ? t('community.installing')
                            : t('community.install')}
                        </Button>
                        <Button
                          size='small'
                          variant='outlined'
                          startIcon={<LaunchIcon />}
                          href={command.url}
                          target='_blank'
                          rel='noopener noreferrer'
                        >
                          {t('community.viewOnGitHub')}
                        </Button>
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Command Preview Dialog */}
      <Dialog
        open={previewDialog.open}
        onClose={() => setPreviewDialog({ open: false, command: null })}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          {t('community.previewTitle', { name: previewDialog.command?.metadata?.name ?? '' })}
        </DialogTitle>
        <DialogContent>
          <Alert severity='info' sx={{ mb: 2 }}>
            <Typography variant='body2'>{t('community.previewNotice')}</Typography>
          </Alert>

          {previewDialog.command && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant='body2'>
                <strong>{t('community.fieldDescription')}</strong>{' '}
                {previewDialog.command.metadata?.description}
              </Typography>
              <Typography variant='body2'>
                <strong>{t('community.fieldCategory')}</strong>{' '}
                {getCategoryLabel(previewDialog.command.metadata?.category)}
              </Typography>
              <Typography variant='body2'>
                <strong>{t('community.fieldAuthor')}</strong> {previewDialog.command.author}
              </Typography>

              <Link
                href={previewDialog.command.url}
                target='_blank'
                rel='noopener noreferrer'
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                <GitHubIcon fontSize='small' />
                {t('community.viewDetails')}
                <LaunchIcon fontSize='small' />
              </Link>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog({ open: false, command: null })}>
            {t('common.close')}
          </Button>
          {previewDialog.command && (
            <Button
              variant='contained'
              startIcon={<InstallIcon />}
              onClick={() => {
                handleInstallCommand(previewDialog.command!);
                setPreviewDialog({ open: false, command: null });
              }}
            >
              {t('community.installCommand')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CommunityCommands;
