import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Box,
  Typography,
  TextField,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Chip,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Autocomplete,
} from '@mui/material';
import {
  Collections as CollectionIcon,
  Code as CodeIcon,
  Share as ShareIcon,
  CheckCircle as SuccessIcon,
  GitHub as GitHubIcon,
  Send as SendIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { CustomCommand } from '#types/custom-commands';
import { ShareCollectionData } from '#services/GitHubApiService';
import { useLanguage } from '#contexts/LanguageContext';
import { TranslationKey } from '../i18n';

interface ShareCollectionDialogProps {
  open: boolean;
  commands: CustomCommand[];
  onShare: (collectionData: ShareCollectionData) => Promise<void>;
  onClose: () => void;
}

const categories: { value: string; labelKey: TranslationKey }[] = [
  { value: 'Form Actions', labelKey: 'share.category.formActions' },
  { value: 'Navigation', labelKey: 'share.category.navigation' },
  { value: 'Data Management', labelKey: 'share.category.dataManagement' },
  { value: 'UI Enhancement', labelKey: 'share.category.uiEnhancement' },
  { value: 'Development Tools', labelKey: 'share.category.developmentTools' },
  { value: 'Workflow Automation', labelKey: 'share.category.workflowAutomation' },
  { value: 'Reporting & Analytics', labelKey: 'share.category.reporting' },
  { value: 'User Management', labelKey: 'share.category.userManagement' },
  { value: 'Business Process', labelKey: 'share.category.businessProcess' },
  { value: 'Other', labelKey: 'share.category.other' },
];

const dynamicsVersions: { value: string; labelKey: TranslationKey }[] = [
  { value: 'Any', labelKey: 'share.version.any' },
  { value: 'Dynamics 365 Online', labelKey: 'share.version.online' },
  { value: 'Dynamics 365 (on-premises)', labelKey: 'share.version.onPremises' },
  { value: 'Power Platform', labelKey: 'share.version.powerPlatform' },
  { value: 'Dynamics 365 Customer Engagement', labelKey: 'share.version.customerEngagement' },
  { value: 'Dynamics 365 Finance & Operations', labelKey: 'share.version.financeOperations' },
  { value: 'Version 9.2+', labelKey: 'share.version.v92' },
];

const commonTags = [
  'workflow',
  'automation',
  'reporting',
  'data-migration',
  'integration',
  'productivity',
  'business-process',
  'data-management',
  'ui-enhancement',
  'analytics',
  'user-management',
  'development',
  'utilities',
];

const steps: TranslationKey[] = [
  'share.stepSelect',
  'share.stepDetails',
  'share.stepSafety',
  'share.stepPreview',
];

const ShareCollectionDialog: React.FC<ShareCollectionDialogProps> = ({
  open,
  commands,
  onShare,
  onClose,
}) => {
  const { t } = useLanguage();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedCommands, setSelectedCommands] = useState<Set<string>>(new Set());
  const [collectionName, setCollectionName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [author, setAuthor] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [dynamicsVersion, setDynamicsVersion] = useState('Any');
  const [contactInfo, setContactInfo] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [shareComplete, setShareComplete] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Safety checklist state
  const [safetyChecklist, setSafetyChecklist] = useState({
    tested: false,
    noSensitiveData: false,
    bestPractices: false,
    confirmations: false,
    publicLicense: false,
  });

  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setActiveStep(0);
      setSelectedCommands(new Set());
      setCollectionName('');
      setDescription('');
      setCategory('');
      setAuthor('');
      setTags([]);
      setDynamicsVersion('Any');
      setContactInfo('');
      setIsSharing(false);
      setShareComplete(false);
      setErrors([]);
      setSafetyChecklist({
        tested: false,
        noSensitiveData: false,
        bestPractices: false,
        confirmations: false,
        publicLicense: false,
      });
    }
  }, [open]);

  const handleCommandToggle = (commandId: string) => {
    const newSelected = new Set(selectedCommands);
    if (newSelected.has(commandId)) {
      newSelected.delete(commandId);
    } else {
      newSelected.add(commandId);
    }
    setSelectedCommands(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCommands.size === commands.length) {
      setSelectedCommands(new Set());
    } else {
      setSelectedCommands(new Set(commands.map(cmd => cmd.id)));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: string[] = [];

    switch (step) {
      case 0: // Select Commands
        if (selectedCommands.size === 0) {
          newErrors.push(t('share.error.selectOne'));
        }
        break;
      case 1: // Collection Details
        if (!collectionName.trim()) {
          newErrors.push(t('share.error.nameRequired'));
        }
        if (!description.trim()) {
          newErrors.push(t('share.error.descRequired'));
        } else if (description.length < 20) {
          newErrors.push(t('share.error.descLength'));
        }
        if (!author.trim()) {
          newErrors.push(t('share.error.authorRequired'));
        }
        if (!category.trim()) {
          newErrors.push(t('share.error.categoryRequired'));
        }
        break;
      case 2: // Safety & Quality
        const requiredChecks = Object.values(safetyChecklist);
        if (!requiredChecks.every(checked => checked)) {
          newErrors.push(t('share.error.safetyRequired'));
        }
        break;
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const buildGitHubIssueUrl = () => {
    const baseUrl =
      'https://github.com/rajyraman/level-up-community-commands/issues/new?template=share-command-collection.yml';
    const params = new URLSearchParams();

    if (collectionName.trim()) params.set('collection-name', collectionName.trim());
    if (description.trim()) params.set('description', description.trim());
    if (category.trim()) params.set('category', category.trim());
    if (tags.length > 0) params.set('tags', tags.join(', '));
    if (dynamicsVersion.trim()) params.set('dynamics-version', dynamicsVersion.trim());
    if (author.trim()) params.set('author-attribution', author.trim());
    if (contactInfo.trim()) params.set('contact-info', contactInfo.trim());

    // Add command count
    params.set('command-count', selectedCommands.size.toString());

    // Add commands JSON
    if (selectedCommands.size > 0) {
      const selectedCommandsList = commands.filter(cmd => selectedCommands.has(cmd.id));
      const commandsJson = JSON.stringify(
        {
          version: '1.0.0',
          exportedAt: Date.now(),
          commands: selectedCommandsList,
        },
        null,
        2
      );
      params.set('commands-json', commandsJson);
    }

    return `${baseUrl}&${params.toString()}`;
  };

  const handleShare = async () => {
    if (!validateStep(activeStep)) return;

    setIsSharing(true);
    try {
      const selectedCommandsList = commands.filter(cmd => selectedCommands.has(cmd.id));

      const collectionData: ShareCollectionData = {
        collectionName: collectionName.trim(),
        description: description.trim(),
        category: category.trim(),
        author: author.trim(),
        tags: tags,
        dynamicsVersion: dynamicsVersion.trim(),
        setupInstructions: '',
        commandCount: selectedCommandsList.length,
        commandsJson: JSON.stringify(
          {
            version: '1.0.0',
            exportedAt: Date.now(),
            commands: selectedCommandsList,
          },
          null,
          2
        ),
        workflowDiagram: undefined,
        contactInfo: contactInfo.trim() || undefined,
      };

      await onShare(collectionData);
      setShareComplete(true);
      setActiveStep(steps.length); // Move to success step
    } catch (error) {
      setErrors([t('share.error.shareFailed', { message: (error as Error).message })]);
    } finally {
      setIsSharing(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Select Commands
        return (
          <Box>
            <Typography variant='body2' color='text.secondary' mb={2}>
              {t('share.selectDesc')}
            </Typography>

            <Box mb={2}>
              <Button
                variant='outlined'
                size='small'
                onClick={handleSelectAll}
                startIcon={<CollectionIcon />}
              >
                {selectedCommands.size === commands.length
                  ? t('common.deselectAll')
                  : t('common.selectAll')}
              </Button>
              <Typography variant='body2' color='text.secondary' mt={1}>
                {t('share.selectedCount', {
                  selected: selectedCommands.size,
                  total: commands.length,
                })}
              </Typography>
            </Box>

            <FormGroup>
              {commands.map(command => (
                <Card key={command.id} variant='outlined' sx={{ mb: 1 }}>
                  <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedCommands.has(command.id)}
                          onChange={() => handleCommandToggle(command.id)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant='subtitle2'>{command.name}</Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {command.description || t('common.noDescription')}
                          </Typography>
                        </Box>
                      }
                      sx={{ alignItems: 'flex-start', m: 0 }}
                    />
                  </CardContent>
                </Card>
              ))}
            </FormGroup>
          </Box>
        );

      case 1: // Collection Details
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label={t('share.name')}
              value={collectionName}
              onChange={e => setCollectionName(e.target.value)}
              placeholder={t('share.namePlaceholder')}
              helperText={t('share.nameHelper')}
              required
            />

            <TextField
              fullWidth
              label={t('share.description')}
              value={description}
              onChange={e => setDescription(e.target.value)}
              multiline
              rows={3}
              placeholder={t('share.descriptionPlaceholder')}
              helperText={t('share.descriptionHelper')}
              required
            />

            <FormControl fullWidth required>
              <InputLabel>{t('share.category')}</InputLabel>
              <Select
                value={category}
                onChange={e => setCategory(e.target.value)}
                label={t('share.category')}
              >
                {categories.map(cat => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {t(cat.labelKey)}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>{t('share.categoryHelper')}</FormHelperText>
            </FormControl>

            <TextField
              fullWidth
              label={t('share.author')}
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder={t('share.authorPlaceholder')}
              helperText={t('share.authorHelper')}
              required
            />

            <Autocomplete
              multiple
              options={commonTags}
              value={tags}
              onChange={(_, newValue) => setTags(newValue)}
              freeSolo
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant='outlined'
                    label={option}
                    {...getTagProps({ index })}
                    key={option}
                  />
                ))
              }
              renderInput={params => (
                <TextField
                  {...params}
                  label={t('share.tags')}
                  placeholder={t('share.tagsPlaceholder')}
                  helperText={t('share.tagsHelper')}
                />
              )}
            />

            <FormControl fullWidth>
              <InputLabel>{t('share.version')}</InputLabel>
              <Select
                value={dynamicsVersion}
                onChange={e => setDynamicsVersion(e.target.value)}
                label={t('share.version')}
              >
                {dynamicsVersions.map(version => (
                  <MenuItem key={version.value} value={version.value}>
                    {t(version.labelKey)}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>{t('share.versionHelper')}</FormHelperText>
            </FormControl>
          </Box>
        );

      case 2: // Safety & Quality
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity='info' icon={<SecurityIcon />}>
              <Typography variant='body2'>{t('share.safetyInfo')}</Typography>
            </Alert>

            <TextField
              fullWidth
              label={t('share.contact')}
              value={contactInfo}
              onChange={e => setContactInfo(e.target.value)}
              placeholder={t('share.contactPlaceholder')}
              helperText={t('share.contactHelper')}
            />

            <Typography variant='subtitle1' sx={{ mt: 2, mb: 1 }}>
              {t('share.checklistTitle')}
            </Typography>

            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={safetyChecklist.tested}
                    onChange={e =>
                      setSafetyChecklist(prev => ({ ...prev, tested: e.target.checked }))
                    }
                  />
                }
                label={t('share.check.tested')}
                required
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={safetyChecklist.noSensitiveData}
                    onChange={e =>
                      setSafetyChecklist(prev => ({ ...prev, noSensitiveData: e.target.checked }))
                    }
                  />
                }
                label={t('share.check.noSensitiveData')}
                required
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={safetyChecklist.bestPractices}
                    onChange={e =>
                      setSafetyChecklist(prev => ({ ...prev, bestPractices: e.target.checked }))
                    }
                  />
                }
                label={t('share.check.bestPractices')}
                required
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={safetyChecklist.confirmations}
                    onChange={e =>
                      setSafetyChecklist(prev => ({ ...prev, confirmations: e.target.checked }))
                    }
                  />
                }
                label={t('share.check.confirmations')}
                required
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={safetyChecklist.publicLicense}
                    onChange={e =>
                      setSafetyChecklist(prev => ({ ...prev, publicLicense: e.target.checked }))
                    }
                  />
                }
                label={t('share.check.publicLicense')}
                required
              />
            </FormGroup>
          </Box>
        );

      case 3: // Preview & Share
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity='info' sx={{ mb: 2 }}>
              <Typography variant='body2'>{t('share.previewInfo')}</Typography>
            </Alert>

            <Card variant='outlined'>
              <CardContent>
                <Typography variant='h6' gutterBottom>
                  <CollectionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {t('share.collectionPreview')}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                  <Typography variant='body2'>
                    <strong>{t('share.nameLabel')}:</strong> {collectionName}
                  </Typography>
                  <Typography variant='body2'>
                    <strong>{t('share.categoryLabel')}:</strong> {category}
                  </Typography>
                  <Typography variant='body2'>
                    <strong>{t('share.authorLabel')}:</strong> {author}
                  </Typography>
                  <Typography variant='body2'>
                    <strong>{t('share.versionLabel')}:</strong> {dynamicsVersion}
                  </Typography>
                  <Typography variant='body2'>
                    <strong>{t('share.commandsLabel')}:</strong>{' '}
                    {t('share.commandsSelected', { count: selectedCommands.size })}
                  </Typography>
                </Box>

                <Typography variant='body2' paragraph>
                  <strong>{t('share.descriptionLabel')}:</strong> {description}
                </Typography>

                {tags.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant='body2' sx={{ mb: 1 }}>
                      <strong>{t('share.tagsLabel')}:</strong>
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {tags.map(tag => (
                        <Chip key={tag} label={tag} size='small' variant='outlined' />
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>

            <Typography variant='subtitle2' mb={1}>
              {t('share.includedCommands')}
            </Typography>
            <List dense>
              {commands
                .filter(cmd => selectedCommands.has(cmd.id))
                .map(command => (
                  <ListItem key={command.id}>
                    <ListItemIcon>
                      <CodeIcon fontSize='small' />
                    </ListItemIcon>
                    <ListItemText
                      primary={command.name}
                      secondary={command.description || t('common.noDescription')}
                    />
                  </ListItem>
                ))}
            </List>
          </Box>
        );

      default:
        return null;
    }
  };

  // Success state
  if (shareComplete) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <SuccessIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant='h5' gutterBottom>
            {t('share.successTitle')}
          </Typography>
          <Typography variant='body1' color='text.secondary' paragraph>
            {t('share.successDesc')}
          </Typography>
          <Button
            variant='outlined'
            startIcon={<GitHubIcon />}
            href={buildGitHubIssueUrl()}
            target='_blank'
            rel='noopener noreferrer'
            sx={{ mb: 2 }}
          >
            {t('share.openIssueForm')}
          </Button>
          <Box>
            <Button onClick={handleClose} variant='contained'>
              {t('common.close')}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth='md'
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' },
      }}
    >
      <DialogTitle>
        <Box display='flex' alignItems='center' gap={1}>
          <ShareIcon />
          {t('share.title')}
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} orientation='vertical'>
          {steps.map((labelKey, index) => (
            <Step key={labelKey}>
              <StepLabel>{t(labelKey)}</StepLabel>
              <StepContent>
                {renderStepContent(index)}
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  {index > 0 && (
                    <Button onClick={handleBack} variant='outlined'>
                      {t('common.back')}
                    </Button>
                  )}
                  {index < steps.length - 1 ? (
                    <Button onClick={handleNext} variant='contained'>
                      {t('common.next')}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleShare}
                      variant='contained'
                      disabled={isSharing || selectedCommands.size === 0}
                      startIcon={isSharing ? <CircularProgress size={20} /> : <SendIcon />}
                    >
                      {isSharing ? t('share.openingGitHub') : t('share.openIssueForm')}
                    </Button>
                  )}
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {errors.length > 0 && (
          <Alert severity='error' sx={{ mt: 2 }}>
            {errors.map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isSharing}>
          {t('common.cancel')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareCollectionDialog;
