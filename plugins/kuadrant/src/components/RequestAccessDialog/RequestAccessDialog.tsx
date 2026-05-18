import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  CircularProgress,
} from '@material-ui/core';
import InfoIcon from '@material-ui/icons/Info';
import {
  useApi,
  alertApiRef,
} from '@backstage/core-plugin-api';
import { kuadrantApiRef } from '../../api';
import { Plan } from "../../types/api-management.ts";

export interface RequestAccessDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  apiProductName: string;
  namespace: string;
  userEmail: string;
  plans: Plan[];
}

export const RequestAccessDialog = ({
  open,
  onClose,
  onSuccess,
  apiProductName,
  namespace,
  userEmail,
  plans,
}: RequestAccessDialogProps) => {
  const kuadrantApi = useApi(kuadrantApiRef);
  const alertApi = useApi(alertApiRef);

  const [selectedPlan, setSelectedPlan] = useState('');
  const [useCase, setUseCase] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleClose = () => {
    setSelectedPlan('');
    setUseCase('');
    setCreateError(null);
    onClose();
  };

  const handleRequestAccess = async () => {
    if (!selectedPlan) return;

    setCreating(true);
    setCreateError(null);

    try {
      // 1. Generate API key
      const apiKeyValue = crypto.randomUUID();

      // 2. Generate secret name (opaque, no PII)
      const secretName = `${apiProductName}-${crypto.randomUUID()}-secret`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-');

      // 3. Create secret in consumer's namespace (backend determines namespace from auth)
      await kuadrantApi.createSecret(secretName, apiKeyValue);

      try {
        // 4. Create APIKey resource (backend creates in consumer's namespace)
        await kuadrantApi.createRequest({
          apiProductName,
          namespace,
          planTier: selectedPlan,
          useCase: useCase.trim() || '',
          userEmail,
          secretName,
        });

        // 5. Success - request submitted and pending approval
        // Consumer can view the API key in My API Keys tab
        // Key exists but won't work until approved
        alertApi.post({
          message: `Request submitted successfully. Pending API owner approval. View your API key in the My API Keys tab.`,
          severity: 'info',
          display: 'transient',
        });

        setSelectedPlan('');
        setUseCase('');
        onSuccess();

      } catch (apiKeyError) {
        // APIKey creation failed - cleanup orphaned secret
        // Note: backend will delete from user's own namespace
        try {
          // Pass any namespace - backend validates it's the user's own namespace
          await kuadrantApi.deleteSecret('consumer', secretName);
        } catch (deleteError) {
          console.warn('Failed to cleanup orphaned secret:', deleteError);
        }
        throw apiKeyError;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'unknown error occurred';
      alertApi.post({
        message: `Failed to create request: ${errorMessage}`,
        severity: 'error',
        display: 'transient',
      });
      setCreateError(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Request API Access</DialogTitle>
      <DialogContent>
        <Box
          mb={2}
          p={1.5}
          bgcolor="info.light"
          borderRadius={1}
          display="flex"
          alignItems="flex-start"
          style={{ gap: 8 }}
        >
          <InfoIcon
            color="primary"
            fontSize="small"
            style={{ marginTop: 2 }}
          />
          <Typography variant="body2">
            Your request will be reviewed by an API owner before access is
            granted.
          </Typography>
        </Box>
        {createError && (
          <Box
            mb={2}
            p={2}
            bgcolor="error.main"
            color="error.contrastText"
            borderRadius={1}
          >
            <Typography variant="body2">{createError}</Typography>
          </Box>
        )}
        <FormControl
          fullWidth
          margin="normal"
          disabled={creating}
          data-testid="tier-select-form"
        >
          <InputLabel id="tier-select-label">Select Tier</InputLabel>
          <Select
            labelId="tier-select-label"
            data-testid="tier-select"
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value as string)}
            disabled={creating}
          >
            {plans.map((plan: Plan) => {
              const limitDesc = Object.entries(plan.limits || {})
                .map(([key, val]) => `${val} per ${key}`)
                .join(', ');
              return (
                <MenuItem
                  key={plan.tier}
                  value={plan.tier}
                  data-testid={`tier-option-${plan.tier}`}
                >
                  {plan.tier} {limitDesc ? `(${limitDesc})` : ''}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
        <TextField
          label="Use Case (optional)"
          placeholder="Describe how you plan to use this API"
          multiline
          rows={3}
          fullWidth
          margin="normal"
          value={useCase}
          onChange={(e) => setUseCase(e.target.value)}
          helperText="Explain your intended use of this API for admin review"
          disabled={creating}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={creating}>
          Cancel
        </Button>
        <Button
          onClick={handleRequestAccess}
          color="primary"
          variant="contained"
          disabled={!selectedPlan || creating}
          startIcon={
            creating ? (
              <CircularProgress size={16} color="inherit" />
            ) : undefined
          }
        >
          {creating ? 'Submitting...' : 'Submit Request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
